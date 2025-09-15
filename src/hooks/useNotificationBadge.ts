import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BadgeCounts {
  totalUnread: number;
  directMessages: number;
  groupMessages: number;
}

export const useNotificationBadge = () => {
  const [badgeCounts, setBadgeCounts] = useState<BadgeCounts>({
    totalUnread: 0,
    directMessages: 0,
    groupMessages: 0
  });

  // Fetch unread message counts
  const { data: unreadCounts } = useQuery({
    queryKey: ['unread-message-counts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { directMessages: 0, groupMessages: 0 };

      // Get unread direct messages
      const { data: directMessages } = await supabase
        .from('direct_messages')
        .select('id')
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      // Get unread group messages
      const { data: userGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (!userGroups?.length) {
        return {
          directMessages: directMessages?.length || 0,
          groupMessages: 0
        };
      }

      const groupIds = userGroups.map(ug => ug.group_id);
      
      const { data: groupMessages } = await supabase
        .from('group_messages')
        .select('id')
        .in('group_id', groupIds)
        .neq('sender_id', user.id)
        .eq('is_read', false);

      return {
        directMessages: directMessages?.length || 0,
        groupMessages: groupMessages?.length || 0
      };
    },
    refetchInterval: 10000, // Refetch every 10 seconds (more frequent)
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // Update badge counts when data changes
  useEffect(() => {
    if (unreadCounts) {
      const totalUnread = unreadCounts.directMessages + unreadCounts.groupMessages;
      console.log('Badge counts updated:', {
        directMessages: unreadCounts.directMessages,
        groupMessages: unreadCounts.groupMessages,
        totalUnread
      });
      setBadgeCounts({
        totalUnread,
        directMessages: unreadCounts.directMessages,
        groupMessages: unreadCounts.groupMessages
      });
    }
  }, [unreadCounts]);

  return badgeCounts;
};
