import { useEffect } from 'react';
import { useNotificationBadge } from '@/hooks/useNotificationBadge';
import { updateFaviconBadge, updateDocumentTitle } from '@/utils/faviconBadge';

export function NotificationBadgeManager() {
  const badgeCounts = useNotificationBadge();

  // Update favicon, document title, and app badge when badge counts change
  useEffect(() => {
    updateFaviconBadge(badgeCounts.totalUnread);
    updateDocumentTitle(badgeCounts.totalUnread);
    
    // Update app badge for installed apps (PWA)
    if ('setAppBadge' in navigator) {
      if (badgeCounts.totalUnread > 0) {
        navigator.setAppBadge(badgeCounts.totalUnread);
      } else {
        navigator.clearAppBadge();
      }
    }

    // Update service worker badge
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: badgeCounts.totalUnread > 0 ? 'SET_BADGE' : 'CLEAR_BADGE',
        count: badgeCounts.totalUnread
      });
    }
  }, [badgeCounts.totalUnread]);

  // This component doesn't render anything, it just manages the badge
  return null;
}
