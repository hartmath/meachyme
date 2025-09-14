import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const usePushNotifications = () => {
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.user) return;

    const initializePushNotifications = async () => {
      try {
        // Request permission to use push notifications
        const permStatus = await PushNotifications.requestPermissions();
        
        if (permStatus.receive === 'granted') {
          // Register with Apple / Google to receive push via APNS/FCM
          await PushNotifications.register();
        } else {
          console.log('Push notification permission denied');
        }
      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }
    };

    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token: ' + token.value);
      
      // Store the token in the user's profile
      try {
        await supabase
          .from('profiles')
          .update({ 
            settings: { 
              push_token: token.value,
              platform: token.type || 'unknown'
            }
          })
          .eq('user_id', session.user.id);
      } catch (error) {
        console.error('Error storing push token:', error);
      }
    });

    // Some issue with our setup and push will not work
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received: ', notification);
      
      // Show a browser notification for foreground notifications
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title || 'New Message', {
          body: notification.body,
          icon: '/favicon.ico',
          tag: 'foreground-notification'
        });
      }
    });

    // Method called when tapping on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification action performed', notification.actionId, notification.inputValue);
      
      // Handle notification tap - navigate to chat if it's a message notification
      if (notification.notification.data?.type === 'message' && notification.notification.data?.chatId) {
        window.location.href = `/chat/${notification.notification.data.chatId}`;
      }
    });

    initializePushNotifications();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [session?.user]);

  return {};
};