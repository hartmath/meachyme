import { supabase } from '@/integrations/supabase/client';

export interface NotificationData {
  type: 'message' | 'group_message' | 'call' | 'group_call';
  chatId?: string;
  groupId?: string;
  senderId?: string;
  senderName?: string;
  groupName?: string;
  callType?: 'voice' | 'video';
}

export const sendPushNotification = async (
  recipientId: string,
  title: string,
  body: string,
  data?: NotificationData
) => {
  try {
    // Get recipient's push token
    const { data: profile } = await supabase
      .from('profiles')
      .select('settings')
      .eq('user_id', recipientId)
      .single();

    if (!profile?.settings?.push_token) {
      console.log('No push token found for user:', recipientId);
      return;
    }

    // For web tokens, show browser notification directly
    if (profile.settings.platform === 'web') {
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body,
          icon: '/favicon.ico',
          data: data,
          tag: `notification-${Date.now()}`
        });
        
        notification.onclick = () => {
          window.focus();
          if (data?.type === 'message' && data?.chatId) {
            window.location.href = `/chat/${data.chatId}`;
          } else if (data?.type === 'group_message' && data?.groupId) {
            window.location.href = `/chat/group/${data.groupId}`;
          }
        };
        
        console.log('Web notification sent successfully');
        return;
      }
    }

    // For mobile tokens, use Supabase Edge Function
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        to: profile.settings.push_token,
        title,
        body,
        data
      }
    });

    if (error) {
      console.error('Error sending push notification:', error);
    } else {
      console.log('Push notification sent successfully');
    }
  } catch (error) {
    console.error('Error in sendPushNotification:', error);
  }
};

export const sendMessageNotification = async (
  recipientId: string,
  senderName: string,
  messageContent: string,
  chatId: string
) => {
  await sendPushNotification(
    recipientId,
    `New message from ${senderName}`,
    messageContent.length > 50 ? `${messageContent.substring(0, 50)}...` : messageContent,
    {
      type: 'message',
      chatId,
      senderName
    }
  );
};

export const sendGroupMessageNotification = async (
  recipientId: string,
  senderName: string,
  groupName: string,
  messageContent: string,
  groupId: string
) => {
  await sendPushNotification(
    recipientId,
    `${senderName} in ${groupName}`,
    messageContent.length > 50 ? `${messageContent.substring(0, 50)}...` : messageContent,
    {
      type: 'group_message',
      groupId,
      senderName,
      groupName
    }
  );
};

export const sendCallNotification = async (
  recipientId: string,
  callerName: string,
  callType: 'voice' | 'video',
  chatId: string
) => {
  await sendPushNotification(
    recipientId,
    `Incoming ${callType} call`,
    `${callerName} is calling you`,
    {
      type: 'call',
      chatId,
      senderName: callerName,
      callType
    }
  );
};

export const sendGroupCallNotification = async (
  recipientId: string,
  callerName: string,
  groupName: string,
  callType: 'voice' | 'video',
  groupId: string
) => {
  await sendPushNotification(
    recipientId,
    `Group ${callType} call`,
    `${callerName} started a ${callType} call in ${groupName}`,
    {
      type: 'group_call',
      groupId,
      senderName: callerName,
      groupName,
      callType
    }
  );
};
