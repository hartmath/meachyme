import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseDataLoadingOptions {
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number;
}

export function useDataLoading<T>(
  loadData: () => Promise<T>,
  options: UseDataLoadingOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  const {
    onError,
    retryCount: maxRetries = 3,
    retryDelay = 1000,
  } = options;

  const load = async () => {
    try {
      setLoading(true);
      const result = await loadData();
      setData(result);
      setError(null);
      setRetryCount(0);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An error occurred');
      console.error('Data loading error:', error);
      setError(error);
      
      // Handle retries
      if (retryCount < maxRetries) {
        toast({
          title: 'Loading failed',
          description: `Retrying... (${retryCount + 1}/${maxRetries})`,
          variant: 'destructive',
        });
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, retryDelay);
      } else {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        onError?.(error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [retryCount]);

  return { data, loading, error, reload: load };
}
