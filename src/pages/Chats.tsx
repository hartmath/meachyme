import { Search, Plus, MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SearchModal } from "@/components/SearchModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loading } from "@/components/Loading";

export default function Chats() {
  const navigate = useNavigate();
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Fetch conversations from Supabase
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get all direct messages where current user is sender or recipient
      const { data: messages, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }

      // Get unique user IDs to fetch profiles
      const userIds = new Set<string>();
      messages?.forEach((message) => {
        if (message.sender_id) userIds.add(message.sender_id);
        if (message.recipient_id) userIds.add(message.recipient_id);
      });

      // Fetch profiles for all users
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, user_type')
        .in('user_id', Array.from(userIds));

      if (profileError) {
        console.error('Error fetching profiles:', profileError);
        return [];
      }

      // Create a map of user profiles
      const profileMap = new Map();
      profiles?.forEach((profile) => {
        profileMap.set(profile.user_id, profile);
      });

      // Group messages by conversation partner
      const conversationMap = new Map();
      
      messages?.forEach((message) => {
        const isCurrentUserSender = message.sender_id === user.id;
        const partnerId = isCurrentUserSender ? message.recipient_id : message.sender_id;
        const partner = profileMap.get(partnerId);
        
        if (!partner || !partnerId || partnerId === user.id) return;

        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            id: partnerId,
            name: partner.full_name || 'Unknown User',
            role: partner.user_type || 'User',
            lastMessage: message.content,
            timestamp: new Date(message.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            unread: isCurrentUserSender ? 0 : (message.is_read ? 0 : 1),
            avatar: partner.full_name ? partner.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U',
            avatar_url: partner.avatar_url
          });
        }
      });

      return Array.from(conversationMap.values());
    }
  });

  // Fetch current user's profile
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      return profile;
    }
  });

  const handleNewIndividualChat = () => {
    navigate("/contact-discovery");
    setIsNewChatOpen(false);
  };

  const handleNewGroupChat = () => {
    navigate("/groups");
    setIsNewChatOpen(false);
  };

  return (
    <div className="flex flex-col h-screen bg-background relative">
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center space-x-2">
          <img 
            src="/mea-logo.jpg" 
            alt="MEA Chyme Logo" 
            className="w-8 h-8 rounded-full object-cover"
          />
          <h1 className="text-lg font-bold">Chyme</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchModalOpen(true)}
            className="h-8 w-8"
          >
            <Search className="h-4 w-4" />
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <SearchModal open={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search conversations..."
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto pb-20">
        {isLoading ? (
          <Loading className="p-8" text="Loading conversations..." />
        ) : conversations && conversations.length > 0 ? (
          conversations.map((chat) => (
            <div
              key={chat.id}
              onClick={() => navigate(`/chat/${chat.id}`)}
              className="flex items-center p-3 hover:bg-accent cursor-pointer border-b border-border/50"
            >
              {/* Avatar */}
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold mr-3 text-sm">
                {chat.avatar_url ? (
                  <img 
                    src={chat.avatar_url} 
                    alt={chat.name} 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  chat.avatar
                )}
              </div>

              {/* Chat Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground truncate text-sm">{chat.name}</h3>
                  <span className="text-xs text-muted-foreground">{chat.timestamp}</span>
                </div>
                <p className="text-xs text-primary font-medium mb-0.5">{chat.role}</p>
                <p className="text-xs text-muted-foreground truncate">{chat.lastMessage}</p>
              </div>

              {/* Unread Badge */}
              {chat.unread > 0 && (
                <div className="w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs font-bold ml-2">
                  {chat.unread}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-foreground mb-2">No conversations yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Start a new conversation to get started</p>
            <Button onClick={() => setIsNewChatOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>
        )}
      </div>

      {/* Floating New Chat Button with Sheet */}
      <Sheet open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-20 right-4 w-12 h-12 rounded-full shadow-lg z-50"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-lg">Start a new conversation</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-2 pb-4">
            {/* New Individual Chat */}
            <button
              onClick={handleNewIndividualChat}
              className="w-full flex items-center p-3 hover:bg-accent rounded-lg transition-colors"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-foreground text-sm">New Chat</h3>
                <p className="text-xs text-muted-foreground">Start a private conversation</p>
              </div>
            </button>

            {/* New Group Chat */}
            <button
              onClick={handleNewGroupChat}
              className="w-full flex items-center p-3 hover:bg-accent rounded-lg transition-colors"
            >
              <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center mr-3">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-foreground text-sm">New Group</h3>
                <p className="text-xs text-muted-foreground">Create a group for your event team</p>
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}