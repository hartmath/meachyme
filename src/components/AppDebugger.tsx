import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';

export function AppDebugger() {
  const { user, session, loading } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Test profile query
  const { data: profile, error: profileError } = useQuery({
    queryKey: ['debug-profile'],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Test conversations query
  const { data: conversations, error: conversationsError } = useQuery({
    queryKey: ['debug-conversations'],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const runComprehensiveDiagnostics = async () => {
    setIsLoading(true);
    const info: any = {};

    try {
      // Test 1: Authentication
      info.auth = {
        user: user ? { id: user.id, email: user.email } : null,
        session: session ? 'Active' : 'No session',
        loading
      };

      // Test 2: Database connection
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('count')
          .limit(1);
        info.database = {
          connected: !error,
          error: error?.message
        };
      } catch (dbError: any) {
        info.database = {
          connected: false,
          error: dbError.message
        };
      }

      // Test 3: Profile access
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          info.profile = {
            exists: !!data,
            error: error?.message,
            data: data ? { id: data.id, full_name: data.full_name } : null
          };
        } catch (profileErr: any) {
          info.profile = {
            exists: false,
            error: profileErr.message
          };
        }
      }

      // Test 4: Messages access
      if (user) {
        try {
          const { data, error } = await supabase
            .from('direct_messages')
            .select('count')
            .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
            .limit(1);
          info.messages = {
            accessible: !error,
            error: error?.message,
            count: data?.[0]?.count || 0
          };
        } catch (msgError: any) {
          info.messages = {
            accessible: false,
            error: msgError.message
          };
        }
      }

      // Test 5: Current URL and routing
      info.routing = {
        currentPath: window.location.pathname,
        searchParams: window.location.search,
        hash: window.location.hash
      };

      // Test 6: Browser console errors
      info.consoleErrors = [];
      const originalError = console.error;
      console.error = (...args) => {
        info.consoleErrors.push(args.join(' '));
        originalError.apply(console, args);
      };

      // Test 7: Network connectivity
      try {
        const response = await fetch('https://behddityjbiumdcgattw.supabase.co/rest/v1/', {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlaGRkaXR5amJpdW1kY2dhdHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4Mzg0NDQsImV4cCI6MjA3MzQxNDQ0NH0.NG9I7gbKhdsGL_UzB5fbgtuiFseu8-3QZ3usbNDge08'
          }
        });
        info.network = {
          connected: response.ok,
          status: response.status
        };
      } catch (netError: any) {
        info.network = {
          connected: false,
          error: netError.message
        };
      }

    } catch (error: any) {
      info.generalError = error.message;
    }

    setDebugInfo(info);
    setIsLoading(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>App Debugger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runComprehensiveDiagnostics} disabled={isLoading}>
            {isLoading ? 'Running Diagnostics...' : 'Run Full Diagnostics'}
          </Button>
          
          {/* Quick Status */}
          <div className="grid grid-cols-2 gap-2">
            <div className="text-sm">
              <strong>Auth:</strong> 
              <Badge variant={user ? "default" : "destructive"} className="ml-2">
                {user ? 'Signed In' : 'Not Signed In'}
              </Badge>
            </div>
            <div className="text-sm">
              <strong>Profile:</strong> 
              <Badge variant={profile ? "default" : "destructive"} className="ml-2">
                {profile ? 'Loaded' : 'Not Found'}
              </Badge>
            </div>
            <div className="text-sm">
              <strong>Conversations:</strong> 
              <Badge variant={conversationsError ? "destructive" : "default"} className="ml-2">
                {conversationsError ? 'Error' : 'OK'}
              </Badge>
            </div>
            <div className="text-sm">
              <strong>Current Path:</strong> 
              <span className="ml-2 text-xs">{window.location.pathname}</span>
            </div>
          </div>

          {/* Error Display */}
          {(profileError || conversationsError) && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <h4 className="font-semibold text-red-800 mb-2">Current Errors:</h4>
              {profileError && (
                <div className="text-sm text-red-700">
                  <strong>Profile Error:</strong> {profileError.message}
                </div>
              )}
              {conversationsError && (
                <div className="text-sm text-red-700">
                  <strong>Conversations Error:</strong> {conversationsError.message}
                </div>
              )}
            </div>
          )}
          
          {/* Detailed Debug Info */}
          {debugInfo && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Detailed Diagnostics:</h3>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
