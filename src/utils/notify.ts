import { supabase } from '@/integrations/supabase/client';

export async function notifyUserMessage(recipientId: string, senderName: string, message: string, chatId: string) {
  try {
    await supabase.functions.invoke('send-push-notification', {
      body: {
        recipientId,
        senderName,
        message,
        type: 'message',
        url: `/chat/${chatId}`
      }
    });
  } catch (e) {
    console.warn('notifyUserMessage failed', e);
  }
}


