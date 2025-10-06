import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Test() {
  const { user, session, loading } = useAuth();
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const results: Record<string, any> = {};

    try {
      // Test 1: Basic Supabase connection
      console.log('Testing Supabase connection...');
      const { data: connectionTest, error: connectionError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      results.connection = {
        success: !connectionError,
        error: connectionError?.message || null,
        data: connectionTest
      };

      // Test 2: Authentication status
      console.log('Testing authentication...');
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      results.auth = {
        success: !authError && !!currentUser,
        error: authError?.message || null,
        user: currentUser ? {
          id: currentUser.id,
          email: currentUser.email,
          created_at: currentUser.created_at
        } : null
      };

      // Test 3: Database tables accessibility
      console.log('Testing database tables...');
      const tables = ['profiles', 'direct_messages', 'status_posts', 'event_links_with_profiles'];
      const tableResults: Record<string, any> = {};

      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          
          tableResults[table] = {
            success: !error,
            error: error?.message || null,
            hasData: data && data.length > 0
          };
        } catch (err) {
          tableResults[table] = {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
            hasData: false
          };
        }
      }

      results.tables = tableResults;

      // Test 4: Network connectivity
      console.log('Testing network connectivity...');
      try {
        const response = await fetch('https://behddityjbiumdcgattw.supabase.co/rest/v1/', {
          method: 'HEAD',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlaGRkaXR5amJpdW1kY2dhdHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4Mzg0NDQsImV4cCI6MjA3MzQxNDQ0NH0.NG9I7gbKhdsGL_UzB5fbgtuiFseu8-3QZ3usbNDge08'
          }
        });
        
        results.network = {
          success: response.ok,
          status: response.status,
          statusText: response.statusText
        };
      } catch (err) {
        results.network = {
          success: false,
          error: err instanceof Error ? err.message : 'Network error'
        };
      }

    } catch (error) {
      results.general = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    setTestResults(results);
    setIsRunning(false);
  };

  useEffect(() => {
    // Auto-run tests on component mount
    runTests();
  }, []);

  const getStatusBadge = (success: boolean) => {
    return success ? (
      <Badge variant="default" className="bg-green-500">Success</Badge>
    ) : (
      <Badge variant="destructive">Failed</Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Chyme App Diagnostic Tests</CardTitle>
            <CardDescription>
              Testing data fetching and authentication issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Current Auth Status</h3>
                {loading ? (
                  <Badge variant="secondary">Loading...</Badge>
                ) : user ? (
                  <Badge variant="default" className="bg-green-500">Authenticated</Badge>
                ) : (
                  <Badge variant="destructive">Not Authenticated</Badge>
                )}
              </div>
              
              {user && (
                <div className="bg-muted p-3 rounded-lg">
                  <p><strong>User ID:</strong> {user.id}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
                </div>
              )}

              <Button 
                onClick={runTests} 
                disabled={isRunning}
                className="w-full"
              >
                {isRunning ? 'Running Tests...' : 'Run Diagnostic Tests'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {Object.keys(testResults).length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Test Results</h2>
            
            {testResults.connection && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Supabase Connection
                    {getStatusBadge(testResults.connection.success)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {testResults.connection.error ? (
                    <p className="text-red-500">Error: {testResults.connection.error}</p>
                  ) : (
                    <p className="text-green-500">Connection successful</p>
                  )}
                </CardContent>
              </Card>
            )}

            {testResults.auth && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Authentication
                    {getStatusBadge(testResults.auth.success)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {testResults.auth.error ? (
                    <p className="text-red-500">Error: {testResults.auth.error}</p>
                  ) : testResults.auth.user ? (
                    <div className="space-y-2">
                      <p className="text-green-500">User authenticated</p>
                      <p><strong>ID:</strong> {testResults.auth.user.id}</p>
                      <p><strong>Email:</strong> {testResults.auth.user.email}</p>
                    </div>
                  ) : (
                    <p className="text-yellow-500">No user found</p>
                  )}
                </CardContent>
              </Card>
            )}

            {testResults.network && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Network Connectivity
                    {getStatusBadge(testResults.network.success)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {testResults.network.error ? (
                    <p className="text-red-500">Error: {testResults.network.error}</p>
                  ) : (
                    <p className="text-green-500">
                      Status: {testResults.network.status} {testResults.network.statusText}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {testResults.tables && (
              <Card>
                <CardHeader>
                  <CardTitle>Database Tables</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(testResults.tables).map(([table, result]: [string, any]) => (
                      <div key={table} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="font-mono">{table}</span>
                        {getStatusBadge(result.success)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {testResults.general && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    General Test
                    {getStatusBadge(testResults.general.success)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {testResults.general.error && (
                    <p className="text-red-500">Error: {testResults.general.error}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}