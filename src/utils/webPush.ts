import { supabase } from '@/integrations/supabase/client';

const base64ToUint8Array = (base64: string) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64Safe);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
};

export async function subscribeToPush(reg: ServiceWorkerRegistration): Promise<PushSubscription | null> {
  if (!('PushManager' in window)) return null;
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!key) return null;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(key)
    });
    return sub;
  } catch (e) {
    console.warn('Push subscribe failed', e);
    return null;
  }
}

export async function saveSubscription(sub: PushSubscription) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const json = sub.toJSON();
    await supabase.from('web_push_subscriptions').insert({
      user_id: user.id,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth
    }).select().single();
  } catch (e) {
    console.warn('Save subscription failed', e);
  }
}


