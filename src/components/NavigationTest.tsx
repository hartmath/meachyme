import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Home, Calendar, User } from 'lucide-react';

export function NavigationTest() {
  const navigate = useNavigate();

  const navItems = [
    { icon: MessageCircle, label: "Chats", path: "/chats" },
    { icon: Home, label: "Status", path: "/feed" },
    { icon: Calendar, label: "Events", path: "/events" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Navigation Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {navItems.map(({ icon: Icon, label, path }) => (
          <Button
            key={path}
            onClick={() => navigate(path)}
            variant="outline"
            className="w-full justify-start"
          >
            <Icon className="h-4 w-4 mr-2" />
            {label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
