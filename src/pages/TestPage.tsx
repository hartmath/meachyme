import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function TestPage() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runFullAppTests = async () => {
    setIsRunning(true);
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    try {
      // Test 1: Authentication
      results.tests.push({
        name: 'Authentication',
        status: user && session ? 'pass' : 'fail',
        details: user ? `User: ${user.email}` : 'No user authenticated',
        data: { userId: user?.id, email: user?.email }
      });

      if (!user) {
        setTestResults(results);
        setIsRunning(false);
        return;
      }

      // Test 2: Profile Access
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        results.tests.push({
          name: 'Profile Access',
          status: profile && !error ? 'pass' : 'fail',
          details: profile ? `Profile: ${profile.full_name}` : `Error: ${error?.message}`,
          data: profile
        });
      } catch (e: any) {
        results.tests.push({
          name: 'Profile Access',
          status: 'fail',
          details: e.message,
          data: null
        });
      }

      // Test 3: Direct Messages Query
      try {
        const { data: messages, error } = await supabase
          .from('direct_messages')
          .select('*')
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .limit(10);

        results.tests.push({
          name: 'Direct Messages Query',
          status: !error ? 'pass' : 'fail',
          details: `Found ${messages?.length || 0} messages`,
          data: { count: messages?.length, error: error?.message }
        });
      } catch (e: any) {
        results.tests.push({
          name: 'Direct Messages Query',
          status: 'fail',
          details: e.message,
          data: null
        });
      }

      // Test 4: Conversations Loading (like Chats page)
      try {
        const { data: messages, error: msgError } = await supabase
          .from('direct_messages')
          .select('id, content, created_at, sender_id, recipient_id')
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(100);

        if (msgError) throw msgError;

        const userIds = [...new Set([
          ...messages?.map(m => m.sender_id) || [],
          ...messages?.map(m => m.recipient_id) || []
        ])].filter(id => id !== user.id);

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, user_type')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        const conversationCount = new Set(
          messages?.map(m => m.sender_id === user.id ? m.recipient_id : m.sender_id)
        ).size;

        results.tests.push({
          name: 'Conversations Loading',
          status: 'pass',
          details: `${conversationCount} unique conversations, ${profiles?.length || 0} profiles loaded`,
          data: { conversationCount, profilesCount: profiles?.length, messagesCount: messages?.length }
        });
      } catch (e: any) {
        results.tests.push({
          name: 'Conversations Loading',
          status: 'fail',
          details: e.message,
          data: null
        });
      }

      // Test 5: Status Posts Query
      try {
        const { data: posts, error } = await supabase
          .from('status_posts')
          .select('*')
          .eq('user_id', user.id)
          .limit(5);

        results.tests.push({
          name: 'Status Posts Query',
          status: !error ? 'pass' : 'fail',
          details: `Found ${posts?.length || 0} status posts`,
          data: { count: posts?.length, error: error?.message }
        });
      } catch (e: any) {
        results.tests.push({
          name: 'Status Posts Query',
          status: 'fail',
          details: e.message,
          data: null
        });
      }

      // Test 6: Events Query
      try {
        const { data: events, error } = await supabase
          .from('events')
          .select('*')
          .limit(5);

        results.tests.push({
          name: 'Events Query',
          status: !error ? 'pass' : 'fail',
          details: `Found ${events?.length || 0} events`,
          data: { count: events?.length, error: error?.message }
        });
      } catch (e: any) {
        results.tests.push({
          name: 'Events Query',
          status: 'fail',
          details: e.message,
          data: null
        });
      }

      // Test 7: Group Chats Query
      try {
        const { data: groups, error } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id)
          .limit(5);

        results.tests.push({
          name: 'Group Chats Query',
          status: !error ? 'pass' : 'fail',
          details: `Member of ${groups?.length || 0} groups`,
          data: { count: groups?.length, error: error?.message }
        });
      } catch (e: any) {
        results.tests.push({
          name: 'Group Chats Query',
          status: 'fail',
          details: e.message,
          data: null
        });
      }

      // Test 8: Real-time Connectivity
      try {
        const channel = supabase.channel('test-channel');
        await channel.subscribe();
        const status = channel.state;
        supabase.removeChannel(channel);

        results.tests.push({
          name: 'Real-time Connectivity',
          status: status === 'joined' ? 'pass' : 'fail',
          details: `Channel state: ${status}`,
          data: { state: status }
        });
      } catch (e: any) {
        results.tests.push({
          name: 'Real-time Connectivity',
          status: 'fail',
          details: e.message,
          data: null
        });
      }

    } catch (error: any) {
      results.error = error.message;
    }

    setTestResults(results);
    setIsRunning(false);
  };

  const passedTests = testResults?.tests?.filter((t: any) => t.status === 'pass').length || 0;
  const totalTests = testResults?.tests?.length || 0;
  const allPassed = passedTests === totalTests && totalTests > 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">App Diagnostics</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Comprehensive App Test Suite</CardTitle>
            <p className="text-sm text-muted-foreground">
              Tests all major app functionality including auth, database queries, and real-time connectivity
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={runFullAppTests} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                'Run All Tests'
              )}
            </Button>

            {testResults && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <h3 className="font-semibold">Test Results</h3>
                    <p className="text-sm text-muted-foreground">
                      {testResults.timestamp}
                    </p>
                  </div>
                  <Badge variant={allPassed ? "default" : "destructive"}>
                    {passedTests}/{totalTests} Passed
                  </Badge>
                </div>

                <div className="space-y-2">
                  {testResults.tests.map((test: any, index: number) => (
                    <Card key={index} className={test.status === 'pass' ? 'border-green-200' : 'border-red-200'}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {test.status === 'pass' ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold">{test.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {test.details}
                            </p>
                            {test.data && (
                              <details className="mt-2">
                                <summary className="text-xs text-muted-foreground cursor-pointer">
                                  View Details
                                </summary>
                                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                                  {JSON.stringify(test.data, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {testResults.error && (
                  <Card className="border-red-200">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-red-600">General Error</h4>
                      <p className="text-sm text-red-700 mt-1">{testResults.error}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Navigation</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button onClick={() => navigate('/chats')} variant="outline">
              Chats
            </Button>
            <Button onClick={() => navigate('/feed')} variant="outline">
              Feed
            </Button>
            <Button onClick={() => navigate('/events')} variant="outline">
              Events
            </Button>
            <Button onClick={() => navigate('/profile')} variant="outline">
              Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
