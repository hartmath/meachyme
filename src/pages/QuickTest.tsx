import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function QuickTest() {
  const { user, session, loading } = useAuth();
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (test: string, status: 'success' | 'error' | 'info', message: string, data?: any) => {
    setTestResults(prev => [...prev, {
      test,
      status,
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runQuickTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Test 1: Basic connection
    addResult('Connection', 'info', 'Testing basic Supabase connection...');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (error) {
        addResult('Connection', 'error', `Connection failed: ${error.message}`, error);
      } else {
        addResult('Connection', 'success', 'Connection successful', data);
      }
    } catch (err) {
      addResult('Connection', 'error', `Connection error: ${err}`, err);
    }

    // Test 2: Authentication
    addResult('Auth', 'info', 'Testing authentication...');
    try {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      if (error) {
        addResult('Auth', 'error', `Auth error: ${error.message}`, error);
      } else if (!currentUser) {
        addResult('Auth', 'error', 'No authenticated user found');
      } else {
        addResult('Auth', 'success', `User authenticated: ${currentUser.email}`, {
          id: currentUser.id,
          email: currentUser.email
        });
      }
    } catch (err) {
      addResult('Auth', 'error', `Auth error: ${err}`, err);
    }

    // Test 3: Profiles table
    addResult('Profiles', 'info', 'Testing profiles table access...');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(3);
      
      if (error) {
        addResult('Profiles', 'error', `Profiles error: ${error.message}`, error);
      } else {
        addResult('Profiles', 'success', `Found ${data?.length || 0} profiles`, data);
      }
    } catch (err) {
      addResult('Profiles', 'error', `Profiles error: ${err}`, err);
    }

    // Test 4: Direct messages (if authenticated)
    if (user) {
      addResult('Messages', 'info', 'Testing direct messages access...');
      try {
        const { data, error } = await supabase
          .from('direct_messages')
          .select('*')
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .limit(5);
        
        if (error) {
          addResult('Messages', 'error', `Messages error: ${error.message}`, error);
        } else {
          addResult('Messages', 'success', `Found ${data?.length || 0} messages`, data);
        }
      } catch (err) {
        addResult('Messages', 'error', `Messages error: ${err}`, err);
      }
    } else {
      addResult('Messages', 'info', 'Skipping messages test - not authenticated');
    }

    // Test 5: Status posts (if authenticated)
    if (user) {
      addResult('Status Posts', 'info', 'Testing status posts access...');
      try {
        const { data, error } = await supabase
          .from('status_posts')
          .select('*')
          .eq('user_id', user.id)
          .limit(5);
        
        if (error) {
          addResult('Status Posts', 'error', `Status posts error: ${error.message}`, error);
        } else {
          addResult('Status Posts', 'success', `Found ${data?.length || 0} status posts`, data);
        }
      } catch (err) {
        addResult('Status Posts', 'error', `Status posts error: ${err}`, err);
      }
    } else {
      addResult('Status Posts', 'info', 'Skipping status posts test - not authenticated');
    }

    setIsRunning(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'info':
        return <Badge variant="secondary">Info</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Data Fetching Test</CardTitle>
            <CardDescription>
              Test basic data fetching functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Current Status</h3>
                <div className="flex gap-2">
                  {loading ? (
                    <Badge variant="secondary">Loading...</Badge>
                  ) : user ? (
                    <Badge variant="default" className="bg-green-500">Authenticated</Badge>
                  ) : (
                    <Badge variant="destructive">Not Authenticated</Badge>
                  )}
                  {session && <Badge variant="outline">Session Active</Badge>}
                </div>
              </div>
              
              {user && (
                <div className="bg-muted p-3 rounded-lg">
                  <p><strong>User ID:</strong> {user.id}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                </div>
              )}

              <Button 
                onClick={runQuickTests} 
                disabled={isRunning}
                className="w-full"
              >
                {isRunning ? 'Running Tests...' : 'Run Quick Tests'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{result.test}</span>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(result.status)}
                        <span className="text-xs text-muted-foreground">{result.timestamp}</span>
                      </div>
                    </div>
                    <p className="text-sm">{result.message}</p>
                    {result.data && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer text-muted-foreground">
                          View Data
                        </summary>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
