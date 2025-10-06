import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthDebugger() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    const info: any = {};

    try {
      // Test Supabase connection
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      info.session = { session: !!session, error: sessionError?.message };

      // Test Supabase URL and key
      const url = import.meta.env.VITE_SUPABASE_URL || "https://behddityjbiumdcgattw.supabase.co";
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlaGRkaXR5amJpdW1kY2dhdHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4Mzg0NDQsImV4cCI6MjA3MzQxNDQ0NH0.NG9I7gbKhdsGL_UzB5fbgtuiFseu8-3QZ3usbNDge08";
      
      info.config = {
        url,
        hasKey: !!key,
        keyLength: key?.length
      };

      // Test network connectivity
      try {
        const response = await fetch(url + '/rest/v1/', {
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
          }
        });
        info.network = {
          status: response.status,
          ok: response.ok
        };
      } catch (networkError: any) {
        info.network = {
          error: networkError.message
        };
      }

      // Test auth endpoint
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'test@example.com',
          password: 'wrongpassword'
        });
        info.authTest = {
          error: error?.message,
          hasError: !!error
        };
      } catch (authError: any) {
        info.authTest = {
          error: authError.message
        };
      }

    } catch (error: any) {
      info.generalError = error.message;
    }

    setDebugInfo(info);
    setIsLoading(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Authentication Debugger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostics} disabled={isLoading}>
          {isLoading ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </Button>
        
        {debugInfo && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Debug Information:</h3>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
