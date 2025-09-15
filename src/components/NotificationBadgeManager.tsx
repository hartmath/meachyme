import { useEffect } from 'react';
import { useNotificationBadge } from '@/hooks/useNotificationBadge';
import { updateAppBadge, initializeBadge } from '@/utils/appBadge';

export function NotificationBadgeManager() {
  const badgeCounts = useNotificationBadge();

  // Initialize badge on mount
  useEffect(() => {
    initializeBadge();
  }, []);

  // Update all badge systems when badge counts change
  useEffect(() => {
    const totalUnread = badgeCounts.totalUnread;
    console.log('🔔 Badge counts changed:', badgeCounts);
    console.log('🔔 Total unread:', totalUnread);
    
    // Update app badge using multiple methods
    updateAppBadge(totalUnread);
    
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
