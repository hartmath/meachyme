import { Search, Plus, MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SearchModal } from "@/components/SearchModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ChatContextMenu, useChatContextMenu } from "@/components/ChatContextMenu";
import { Loading } from "@/components/Loading";

export default function Chats() {
  const navigate = useNavigate();
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const { contextMenu, openContextMenu, closeContextMenu } = useChatContextMenu();
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Long press handlers
  const handleMouseDown = (e: React.MouseEvent, chat: any) => {
    longPressTimer.current = setTimeout(() => {
      openContextMenu(e, chat.id, chat.name, chat.is_pinned, chat.is_blocked);
    }, 500); // 500ms long press
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent, chat: any) => {
    longPressTimer.current = setTimeout(() => {
      openContextMenu(e, chat.id, chat.name, chat.is_pinned, chat.is_blocked);
    }, 500); // 500ms long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleCall = (type: 'voice' | 'video') => {
    if (contextMenu) {
      navigate(`/call/${contextMenu.chatId}?type=${type}`);
    }
  };

  const handleDelete = () => {
    // The context menu will handle the deletion
    // This is just for any additional cleanup if needed
  };

  // Fetch conversations from Supabase
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get latest message for each conversation with profile data in a single query
      const { data: messages, error } = await supabase
        .from('direct_messages')
        .select(`
          id,
          content,
          created_at,
          sender_id,
          recipient_id,
          sender:sender_id (user_id, full_name, avatar_url, user_type),
          recipient:recipient_id (user_id, full_name, avatar_url, user_type)
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(100); // Limit to recent messages for better performance

      if (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }

      // Create a map of user profiles from the joined data
      const profileMap = new Map();
      messages?.forEach((message) => {
        if (message.sender) {
          profileMap.set(message.sender.user_id, message.sender);
        }
        if (message.recipient) {
          profileMap.set(message.recipient.user_id, message.recipient);
        }
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
            avatar_url: partner.avatar_url,
            is_pinned: false, // Default values - will be updated from user preferences
            is_blocked: false
          });
        }
      });

      // Get user preferences for pinned and blocked conversations
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('conversation_id, is_pinned, is_blocked')
        .eq('user_id', user.id);

      // Apply preferences to conversations
      const conversationsWithPreferences = Array.from(conversationMap.values()).map(conv => {
        const preference = preferences?.find(p => p.conversation_id === conv.id);
        return {
          ...conv,
          is_pinned: preference?.is_pinned || false,
          is_blocked: preference?.is_blocked || false
        };
      });

      // Sort conversations: pinned first, then by last message time
      return conversationsWithPreferences.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
    },
    staleTime: 30 * 1000, // 30 seconds - conversations change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
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
              onMouseDown={(e) => handleMouseDown(e, chat)}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={(e) => handleTouchStart(e, chat)}
              onTouchEnd={handleTouchEnd}
              className="flex items-center p-3 hover:bg-accent cursor-pointer border-b border-border/50 select-none"
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
                  <div className="flex items-center space-x-1">
                    <h3 className="font-medium text-foreground truncate text-sm">{chat.name}</h3>
                    {chat.is_pinned && (
                      <div className="w-1 h-1 bg-primary rounded-full" title="Pinned chat"></div>
                    )}
                    {chat.is_blocked && (
                      <div className="w-1 h-1 bg-destructive rounded-full" title="Blocked chat"></div>
                    )}
                  </div>
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

      {/* Context Menu */}
      {contextMenu && (
        <ChatContextMenu
          chatId={contextMenu.chatId}
          chatName={contextMenu.chatName}
          isPinned={contextMenu.isPinned}
          isBlocked={contextMenu.isBlocked}
          position={contextMenu.position}
          onClose={closeContextMenu}
          onCall={handleCall}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}