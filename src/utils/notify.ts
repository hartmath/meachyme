import { supabase } from '@/integrations/supabase/client';

export async function notifyUserMessage(recipientId: string, senderName: string, message: string, chatId: string) {
  try {
    // Try web push; fallback to existing mobile push function
    await supabase.functions.invoke('send-web-push', {
      body: {
        recipientId,
        title: `New message from ${senderName}`,
        body: message,
        url: `/chat/${chatId}`
      }
    });
    await supabase.functions.invoke('send-push-notification', {
      body: { recipientId, senderName, message, type: 'message' }
    });
  } catch (e) {
    console.warn('notifyUserMessage failed', e);
  }
}


