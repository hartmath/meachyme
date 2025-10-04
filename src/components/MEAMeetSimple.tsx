import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Video, 
  X,
  Bell,
  Users,
  Mic,
  Monitor
} from 'lucide-react';

interface MEAMeetSimpleProps {
  onClose: () => void;
}

export function MEAMeetSimple({ onClose }: MEAMeetSimpleProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Video className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">MEA Meet</CardTitle>
          <CardDescription className="text-lg">
            Video conferencing is coming soon!
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Coming Soon Features */}
          <div className="space-y-4">
            <h3 className="font-semibold text-center">What to expect:</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <Video className="h-4 w-4 text-primary" />
                <span>HD Video Calls</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <Mic className="h-4 w-4 text-primary" />
                <span>Crystal Clear Audio</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <Monitor className="h-4 w-4 text-primary" />
                <span>Screen Sharing</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <Users className="h-4 w-4 text-primary" />
                <span>Group Meetings</span>
              </div>
            </div>
          </div>

          {/* Notification Signup */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Get notified when it's ready!</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              We'll send you an update when MEA Meet is available for testing.
            </p>
            <Button 
              className="w-full" 
              size="sm"
              onClick={() => {
                // In a real app, this would subscribe to notifications
                alert("Thanks! We'll notify you when MEA Meet is ready.");
                onClose();
              }}
            >
              <Bell className="h-4 w-4 mr-2" />
              Notify Me
            </Button>
          </div>


          {/* Close Button */}
          <div className="flex justify-center">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}