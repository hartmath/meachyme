import { useState, useRef, useEffect } from 'react';
import { Pin, PinOff, Trash2, Shield, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ChatContextMenuProps {
  chatId: string;
  chatName: string;
  isPinned?: boolean;
  isBlocked?: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onDelete?: () => void;
}

export function ChatContextMenu({ 
  chatId, 
  chatName, 
  isPinned = false, 
  isBlocked = false,
  position,
  onClose,
  onDelete 
}: ChatContextMenuProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const menuRef = useRef<HTMLDivElement>(null);

  // Pin/Unpin mutation
  const pinMutation = useMutation({
    mutationFn: async (pinned: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upsert user preference for pinned status
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          conversation_id: chatId,
          is_pinned: pinned,
          is_blocked: isBlocked
        }, {
          onConflict: 'user_id,conversation_id'
        });

      if (error) throw error;
    },
    onSuccess: (_, pinned) => {
      toast({
        title: pinned ? "Chat pinned" : "Chat unpinned",
        description: `${chatName} has been ${pinned ? 'pinned to top' : 'unpinned'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update chat",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Block/Unblock mutation
  const blockMutation = useMutation({
    mutationFn: async (blocked: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upsert user preference for blocked status
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          conversation_id: chatId,
          is_pinned: isPinned,
          is_blocked: blocked
        }, {
          onConflict: 'user_id,conversation_id'
        });

      if (error) throw error;
    },
    onSuccess: (_, blocked) => {
      toast({
        title: blocked ? "Chat blocked" : "Chat unblocked",
        description: `${chatName} has been ${blocked ? 'blocked' : 'unblocked'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update chat",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete conversation mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delete all messages between current user and the chat partner
      const { error: messagesError } = await supabase
        .from('direct_messages')
        .delete()
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${chatId}),and(sender_id.eq.${chatId},recipient_id.eq.${user.id})`);

      if (messagesError) throw messagesError;

      // Delete user preferences for this conversation
      const { error: preferencesError } = await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', user.id)
        .eq('conversation_id', chatId);

      if (preferencesError) throw preferencesError;
    },
    onSuccess: () => {
      toast({
        title: "Chat deleted",
        description: `${chatName} has been deleted.`,
      });
      
      // Invalidate and refetch conversations immediately
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.refetchQueries({ queryKey: ['conversations'] });
      
      // Also invalidate unread message counts
      queryClient.invalidateQueries({ queryKey: ['unread-message-counts'] });
      
      // Force immediate UI update
      queryClient.setQueryData(['conversations'], (oldData: any) => {
        if (!oldData) return [];
        return oldData.filter((conv: any) => conv.id !== chatId);
      });
      
      onClose();
      onDelete?.();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete chat",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handlePin = () => {
    pinMutation.mutate(!isPinned);
  };

  const handleBlock = () => {
    blockMutation.mutate(!isBlocked);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete this chat with ${chatName}? This action cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };


  // Position menu based on click position
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-background border border-border rounded-lg shadow-lg p-2 z-50 min-w-[200px]"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="space-y-1">
        {/* Pin/Unpin */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={handlePin}
          disabled={pinMutation.isPending}
        >
          {isPinned ? <PinOff className="h-4 w-4 mr-2" /> : <Pin className="h-4 w-4 mr-2" />}
          {isPinned ? 'Unpin' : 'Pin'}
        </Button>


        {/* Block/Unblock */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={handleBlock}
          disabled={blockMutation.isPending}
        >
          <Shield className="h-4 w-4 mr-2" />
          {isBlocked ? 'Unblock' : 'Block'}
        </Button>

        {/* Delete */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Chat
        </Button>
      </div>
    </div>
  );
}

// Hook to manage context menu state
export function useChatContextMenu() {
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    chatId: string;
    chatName: string;
    isPinned: boolean;
    isBlocked: boolean;
    position: { x: number; y: number };
  } | null>(null);

  const openContextMenu = (
    e: React.MouseEvent | React.TouchEvent,
    chatId: string,
    chatName: string,
    isPinned: boolean = false,
    isBlocked: boolean = false
  ) => {
    e.preventDefault();
    e.stopPropagation();

    let x, y;
    if ('touches' in e) {
      // Touch event
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      // Mouse event
      x = e.clientX;
      y = e.clientY;
    }

    setContextMenu({
      isOpen: true,
      chatId,
      chatName,
      isPinned,
      isBlocked,
      position: { x, y }
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  return {
    contextMenu,
    openContextMenu,
    closeContextMenu
  };
}
