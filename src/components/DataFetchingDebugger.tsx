import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface QueryDebugInfo {
  queryKey: string;
  status: 'idle' | 'loading' | 'error' | 'success';
  error?: any;
  data?: any;
  lastUpdated?: string;
}

export function DataFetchingDebugger() {
  const { user, session } = useAuth();
  const [debugInfo, setDebugInfo] = useState<QueryDebugInfo[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Test basic profile query
  const { data: profiles, isLoading: profilesLoading, error: profilesError } = useQuery({
    queryKey: ['debug-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user, // Only run if user is authenticated
  });

  // Test conversations query
  const { data: conversations, isLoading: conversationsLoading, error: conversationsError } = useQuery({
    queryKey: ['debug-conversations'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Test status posts query
  const { data: statusPosts, isLoading: statusLoading, error: statusError } = useQuery({
    queryKey: ['debug-status-posts'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('status_posts')
        .select('*')
        .eq('user_id', user.id)
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    const queries = [
      {
        queryKey: 'profiles',
        status: profilesLoading ? 'loading' : profilesError ? 'error' : 'success',
        error: profilesError,
        data: profiles,
        lastUpdated: new Date().toISOString()
      },
      {
        queryKey: 'conversations',
        status: conversationsLoading ? 'loading' : conversationsError ? 'error' : 'success',
        error: conversationsError,
        data: conversations,
        lastUpdated: new Date().toISOString()
      },
      {
        queryKey: 'status-posts',
        status: statusLoading ? 'loading' : statusError ? 'error' : 'success',
        error: statusError,
        data: statusPosts,
        lastUpdated: new Date().toISOString()
      }
    ];

    setDebugInfo(queries);
  }, [profiles, profilesLoading, profilesError, conversations, conversationsLoading, conversationsError, statusPosts, statusLoading, statusError]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'loading':
        return <Badge variant="secondary">Loading</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      default:
        return <Badge variant="outline">Idle</Badge>;
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur-sm"
        >
          Debug Data Fetching
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-y-auto">
      <Card className="bg-background/95 backdrop-blur-sm border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Data Fetching Debug</CardTitle>
            <Button
              onClick={() => setIsVisible(false)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
          <CardDescription className="text-xs">
            Auth: {user ? '✅' : '❌'} | Session: {session ? '✅' : '❌'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {debugInfo.map((info) => (
            <div key={info.queryKey} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono">{info.queryKey}</span>
                {getStatusBadge(info.status)}
              </div>
              
              {info.status === 'error' && info.error && (
                <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
                  {info.error.message || 'Unknown error'}
                </div>
              )}
              
              {info.status === 'success' && info.data && (
                <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                  {Array.isArray(info.data) 
                    ? `${info.data.length} items` 
                    : 'Data loaded'
                  }
                </div>
              )}
              
              {info.status === 'loading' && (
                <div className="text-xs text-blue-500 bg-blue-50 p-2 rounded">
                  Loading...
                </div>
              )}
            </div>
          ))}
          
          <div className="pt-2 border-t">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
