import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useWebPushNotifications = () => {
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.user) return;

    const initializeWebPushNotifications = async () => {
      try {
        // Register service worker
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', registration);
          } catch (error) {
            console.error('Service Worker registration failed:', error);
          }
        }

        // Check if browser supports notifications
        if (!('Notification' in window)) {
          console.log('This browser does not support notifications');
          return;
        }

        // Request permission
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.log('Notification permission denied');
            return;
          }
        }

        if (Notification.permission === 'granted') {
          console.log('Web push notifications enabled');
          
          // Generate a mock push token for web (since we're not using Expo in web)
          const mockToken = `web-push-token-${session.user.id}-${Date.now()}`;
          
          // Store the token in the user's profile
          try {
            await supabase
              .from('profiles')
              .update({ 
                settings: { 
                  push_token: mockToken,
                  platform: 'web'
                }
              })
              .eq('user_id', session.user.id);
              
            console.log('Web push token stored:', mockToken);
          } catch (error) {
            console.error('Error storing web push token:', error);
          }
        }
      } catch (error) {
        console.error('Error initializing web push notifications:', error);
      }
    };

    initializeWebPushNotifications();

    // Handle notification clicks
    const handleNotificationClick = (event: Event) => {
      const notification = event.target as Notification;
      console.log('Notification clicked:', notification);
      
      // Handle navigation based on notification data
      if (notification.data?.type === 'message' && notification.data?.chatId) {
        window.location.href = `/chat/${notification.data.chatId}`;
      } else if (notification.data?.type === 'group_message' && notification.data?.groupId) {
        window.location.href = `/chat/group/${notification.data.groupId}`;
      }
    };

    // Add event listener for notification clicks
    if ('Notification' in window) {
      window.addEventListener('notificationclick', handleNotificationClick);
    }

    return () => {
      if ('Notification' in window) {
        window.removeEventListener('notificationclick', handleNotificationClick);
      }
    };
  }, [session?.user]);

  return {};
};
