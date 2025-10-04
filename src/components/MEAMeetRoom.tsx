import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Video, 
  X,
  Bell,
  Users,
  Mic,
  Monitor,
  Calendar,
  Share2
} from 'lucide-react';

interface MEAMeetRoomProps {
  onJoinMeeting: (meetingId: string, meetingName: string, isHost: boolean) => void;
  onClose: () => void;
}

export function MEAMeetRoom({ onClose }: MEAMeetRoomProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Video className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">MEA Meet Rooms</CardTitle>
          <CardDescription className="text-lg">
            Advanced video conferencing is coming soon!
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Coming Soon Features */}
          <div className="space-y-4">
            <h3 className="font-semibold text-center">Advanced features coming:</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Scheduled Meetings</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <Users className="h-4 w-4 text-primary" />
                <span>Meeting Rooms</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <Share2 className="h-4 w-4 text-primary" />
                <span>Meeting Links</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <Monitor className="h-4 w-4 text-primary" />
                <span>Screen Sharing</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <Mic className="h-4 w-4 text-primary" />
                <span>Audio Controls</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <Video className="h-4 w-4 text-primary" />
                <span>HD Video</span>
              </div>
            </div>
          </div>

          {/* Feature Comparison */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium mb-3 text-center">What's different from Quick Meet?</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Meeting Scheduling</span>
                <span className="text-primary font-medium">✓</span>
              </div>
              <div className="flex justify-between">
                <span>Persistent Meeting Rooms</span>
                <span className="text-primary font-medium">✓</span>
              </div>
              <div className="flex justify-between">
                <span>Meeting History</span>
                <span className="text-primary font-medium">✓</span>
              </div>
              <div className="flex justify-between">
                <span>Advanced Controls</span>
                <span className="text-primary font-medium">✓</span>
              </div>
            </div>
          </div>

          {/* Notification Signup */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Get early access!</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Be among the first to try MEA Meet Rooms when it launches.
            </p>
            <Button 
              className="w-full" 
              size="sm"
              onClick={() => {
                // In a real app, this would subscribe to notifications
                alert("Thanks! We'll notify you when MEA Meet Rooms is ready for early access.");
                onClose();
              }}
            >
              <Bell className="h-4 w-4 mr-2" />
              Request Early Access
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