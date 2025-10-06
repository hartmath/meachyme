import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function AuthStatus() {
  const { user, session, loading, needsOnboarding } = useAuth();
  const navigate = useNavigate();

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Authentication Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>User:</strong> {user ? user.email : 'Not signed in'}
        </div>
        <div>
          <strong>Session:</strong> {session ? 'Active' : 'No session'}
        </div>
        <div>
          <strong>Needs Onboarding:</strong> {needsOnboarding ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>Current URL:</strong> {window.location.pathname}
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate('/auth')}
            variant="outline"
            size="sm"
          >
            Go to Auth
          </Button>
          <Button 
            onClick={() => navigate('/chats')}
            variant="outline"
            size="sm"
          >
            Go to Chats
          </Button>
          <Button 
            onClick={() => navigate('/profile')}
            variant="outline"
            size="sm"
          >
            Go to Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
