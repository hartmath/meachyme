import { useEffect } from 'react';
import { useNotificationBadge } from '@/hooks/useNotificationBadge';
import { updateAppBadge, initializeBadge, forceBadgeUpdate } from '@/utils/appBadge';
import { useQueryClient } from '@tanstack/react-query';

export function NotificationBadgeManager() {
  const badgeCounts = useNotificationBadge();
  const queryClient = useQueryClient();

  // Initialize badge on mount
  useEffect(() => {
    initializeBadge();
  }, []);

  // Periodically refresh badge counts to ensure they stay updated
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Periodic badge refresh');
      queryClient.invalidateQueries({ queryKey: ['unread-message-counts'] });
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [queryClient]);

  // Update all badge systems when badge counts change
  useEffect(() => {
    const totalUnread = badgeCounts.totalUnread;
    console.log('🔔 Badge counts changed:', badgeCounts);
    console.log('🔔 Total unread:', totalUnread);
    
    // Update app badge using multiple methods
    updateAppBadge(totalUnread);
    
    // Force badge update for app wrappers
    forceBadgeUpdate(totalUnread);
    
    // Force a page title update (sometimes needed for web app wrappers)
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) Chyme - Unread Messages`;
    } else {
      document.title = 'Chyme';
    }
    
    console.log('🔔 Document title set to:', document.title);
  }, [badgeCounts.totalUnread]);

  // This component doesn't render anything, it just manages the badge
  return null;
}
