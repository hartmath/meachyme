import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface QueuedMessage {
  id: string;
  type: 'direct' | 'group';
  recipientId: string;
  content: string;
  messageType?: string;
  attachmentUrl?: string;
  timestamp: number;
  retryCount?: number;
}

interface OfflineData {
  conversations: any[];
  messages: any[];
  profiles: any[];
  lastSync: number;
}

export function useOfflineSupport() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const [offlineData, setOfflineData] = useState<OfflineData>({
    conversations: [],
    messages: [],
    profiles: [],
    lastSync: 0
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processQueuedMessages();
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load offline data from localStorage
    loadOfflineData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadOfflineData = () => {
    try {
      // Load queued messages
      const savedMessages = localStorage.getItem('chyme-queued-messages');
      if (savedMessages) {
        setQueuedMessages(JSON.parse(savedMessages));
      }

      // Load offline data
      const savedData = localStorage.getItem('chyme-offline-data');
      if (savedData) {
        setOfflineData(JSON.parse(savedData));
      }
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  };

  const saveOfflineData = (data: Partial<OfflineData>) => {
    const updatedData = { ...offlineData, ...data };
    setOfflineData(updatedData);
    localStorage.setItem('chyme-offline-data', JSON.stringify(updatedData));
  };

  const queueMessage = (message: Omit<QueuedMessage, 'id' | 'timestamp'>) => {
    const queuedMessage: QueuedMessage = {
      ...message,
      id: `queued-${Date.now()}-${Math.random()}`,
      timestamp: Date.now()
    };

    const updated = [...queuedMessages, queuedMessage];
    setQueuedMessages(updated);
    localStorage.setItem('chyme-queued-messages', JSON.stringify(updated));
  };

  const processQueuedMessages = async () => {
    if (queuedMessages.length === 0) return;

    console.log(`Processing ${queuedMessages.length} queued messages...`);

    for (const message of queuedMessages) {
      try {
        // Here you would send the message via your API
        // For now, we'll just simulate success
        console.log('Sending queued message:', message);
        
        // Remove from queue after successful send
        const updated = queuedMessages.filter(m => m.id !== message.id);
        setQueuedMessages(updated);
        localStorage.setItem('chyme-queued-messages', JSON.stringify(updated));
        
        // Invalidate relevant queries to refresh UI
        if (message.type === 'direct') {
          queryClient.invalidateQueries({ queryKey: ['chat-messages', message.recipientId] });
        } else {
          queryClient.invalidateQueries({ queryKey: ['group-messages', message.recipientId] });
        }
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        
      } catch (error) {
        console.error('Failed to send queued message:', error);
        // Keep the message in queue for retry
      }
    }
  };

  const clearQueuedMessages = () => {
    setQueuedMessages([]);
    localStorage.removeItem('chyme-queued-messages');
  };

  return {
    isOnline,
    queuedMessages,
    queueMessage,
    clearQueuedMessages,
    processQueuedMessages
  };
}
