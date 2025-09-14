import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Smile, X } from 'lucide-react';

interface MessageReactionsProps {
  messageId: string;
  messageType: 'direct' | 'group';
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🔥'];

export function MessageReactions({ messageId, messageType }: MessageReactionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch reactions for this message
  const { data: reactions } = useQuery({
    queryKey: ['message-reactions', messageId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_message_reactions', {
        message_id: messageId,
        message_type: messageType
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!messageId
  });

  // Mutation to add/remove reaction
  const reactionMutation = useMutation({
    mutationFn: async ({ emoji, action }: { emoji: string; action: 'add' | 'remove' }) => {
      if (action === 'add') {
        const { error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            emoji,
            message_type: messageType
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('emoji', emoji);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-reactions', messageId] });
    }
  });

  const handleReactionClick = (emoji: string) => {
    const existingReaction = reactions?.find(r => r.emoji === emoji);
    const action = existingReaction?.user_reacted ? 'remove' : 'add';
    
    reactionMutation.mutate({ emoji, action });
    setIsOpen(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    handleReactionClick(emoji);
  };

  if (!reactions || reactions.length === 0) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Smile className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex flex-wrap gap-1">
            {EMOJI_OPTIONS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-lg"
                onClick={() => handleEmojiSelect(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-1">
      {reactions.map((reaction) => (
        <Button
          key={reaction.emoji}
          variant={reaction.user_reacted ? "default" : "outline"}
          size="sm"
          className={`h-6 px-2 text-xs ${
            reaction.user_reacted 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-background hover:bg-muted'
          }`}
          onClick={() => handleReactionClick(reaction.emoji)}
        >
          {reaction.emoji} {reaction.count}
        </Button>
      ))}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Smile className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex flex-wrap gap-1">
            {EMOJI_OPTIONS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-lg"
                onClick={() => handleEmojiSelect(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
