import { useState, useEffect } from "react";
import { ArrowLeft, Search, Users, Plus, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loading } from "@/components/Loading";

interface GroupMember {
  group_id: string;
}

interface GroupMessage {
  content: string;
  created_at: string;
  sender_id: string;
}

interface GroupDetails {
  id: string;
  name: string;
  description: string;
  avatar_url: string;
  created_at: string;
}

interface OnlineMember {
  profiles: {
    is_online: boolean;
  };
}

export default function GroupChatList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch user's groups from Supabase (using new group system)
  const { data: groups, isLoading } = useQuery({
    queryKey: ['user-groups'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get groups where user is a member (using new tables)
      const { data: userGroups, error } = await supabase
        .from('new_group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user groups:', error);
        return [];
      }

      if (!userGroups || userGroups.length === 0) return [];

      // Get group details for each group_id
      const groupIds = userGroups.map((ug: GroupMember) => ug.group_id);
      const { data: groupDetails, error: groupsError } = await supabase
        .from('new_groups')
        .select('id, name, description, avatar_url, created_at')
        .in('id', groupIds);

      if (groupsError) {
        console.error('Error fetching group details:', groupsError);
        return [];
      }

      // Get member counts and last messages for each group
      const groupsWithDetails = await Promise.all(
        (groupDetails || []).map(async (group: GroupDetails) => {
          // Get member count
          const { count: memberCount } = await supabase
            .from('new_group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          // Get last message
          const { data: lastMessage } = await supabase
            .from('new_group_messages')
            .select(`
              content,
              created_at,
              sender_id
            `)
            .eq('group_id', group.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get sender name for last message
          let senderName = 'Someone';
          let messageContent = '';
          let messageTime = '';
          
          if (lastMessage) {
            const msg = lastMessage as GroupMessage;
            if (msg.sender_id) {
              const { data: senderProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', msg.sender_id)
                .single();
              senderName = senderProfile?.full_name ?? 'Someone';
            }
            messageContent = msg.content || '';
            messageTime = msg.created_at || '';
          }

          // Get online members count
          const { data: onlineMembers } = await supabase
            .from('new_group_members')
            .select(`
              profiles (
                is_online
              )
            `)
            .eq('group_id', group.id);

          const isOnline = onlineMembers?.some((member: OnlineMember) => member.profiles?.is_online) || false;

          return {
            id: group.id,
            name: group.name,
            description: group.description,
            avatar_url: group.avatar_url,
            lastMessage: messageContent ? 
              `${senderName}: ${messageContent}` : 
              'No messages yet',
            timestamp: messageTime ? 
              new Date(messageTime).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              }) : 
              'No messages',
            unreadCount: 0, // TODO: Implement unread count
            avatar: group.name.split(' ').map(n => n[0]).join('').toUpperCase(),
            memberCount: memberCount || 0,
            isOnline
          };
        })
      );

      return groupsWithDetails.filter(Boolean);
    }
  });

  // Set up real-time subscription for group messages to update chat list
  useEffect(() => {
    console.log('Setting up real-time subscription for group chat list');

    const channel = supabase
      .channel('group_chat_list_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'new_group_messages'
        },
        (payload) => {
          console.log('New message received, updating chat list:', payload);
          // Invalidate user groups query to refresh the chat list
          queryClient.invalidateQueries({ queryKey: ['user-groups'] });
        }
      )
      .subscribe((status) => {
        console.log('Group chat list real-time subscription status:', status);
      });

    return () => {
      console.log('Cleaning up group chat list real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const filteredGroups = groups?.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleGroupClick = (groupId: string) => {
    navigate(`/chat/group/${groupId}`);
  };

  const createGroup = () => {
    navigate("/create-group");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b border-border bg-card">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/chats")}
            className="mr-2 h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Group Chats</h1>
        </div>
        
        <Button
          onClick={createGroup}
          size="sm"
          className="h-8 px-3 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          New Group
        </Button>
      </header>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>

      {/* Groups List */}
      <div className="px-3">
        {isLoading ? (
          <Loading className="p-8" text="Loading groups..." />
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? "No groups found" : "No group chats yet"}
            </p>
            {!searchQuery && (
              <Button onClick={createGroup} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Group
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                onClick={() => handleGroupClick(group.id)}
                className="flex items-center p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer group"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                    {group.avatar_url ? (
                      <img 
                        src={group.avatar_url} 
                        alt={group.name} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      group.avatar
                    )}
                  </div>
                  {group.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 ml-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground truncate text-sm">
                      {group.name}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground">
                        {group.timestamp}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle group options
                        }}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground truncate flex-1">
                      {group.lastMessage}
                    </p>
                    <div className="flex items-center space-x-2 ml-2">
                      <span className="text-xs text-muted-foreground">
                        {group.memberCount} members
                      </span>
                      {group.unreadCount > 0 && (
                        <div className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {group.unreadCount > 9 ? "9+" : group.unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
