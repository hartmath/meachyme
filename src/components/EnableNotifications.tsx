import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { subscribeToPush, saveSubscription } from '@/utils/webPush';

export const EnableNotifications = () => {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') setVisible(true);
  }, []);

  const handleEnable = async () => {
    try {
      setBusy(true);
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return;
      const sub = await subscribeToPush(reg);
      if (sub) await saveSubscription(sub);
      setVisible(false);
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;
  return (
    <div className="p-3">
      <Card className="p-3 flex items-center justify-between">
        <div className="text-sm">Enable notifications to get message alerts.</div>
        <Button onClick={handleEnable} disabled={busy}>
          {busy ? 'Enabling…' : 'Enable'}
        </Button>
      </Card>
    </div>
  );
};





