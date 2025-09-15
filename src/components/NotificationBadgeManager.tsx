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
    updateAppBadge(badgeCounts.totalUnread);
  }, [badgeCounts.totalUnread]);

  // This component doesn't render anything, it just manages the badge
  return null;
}
