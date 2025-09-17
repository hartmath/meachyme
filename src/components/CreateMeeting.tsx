import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
// import { Calendar } from '@/components/ui/calendar';
// import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Video, 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Copy,
  Share2
} from 'lucide-react';
// import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface CreateMeetingProps {
  onCreateMeeting: (meetingData: MeetingData) => void;
  onJoinMeeting: (meetingId: string) => void;
}

interface MeetingData {
  title: string;
  description?: string;
  scheduledTime?: Date;
  duration?: number;
  isInstant: boolean;
}

export function CreateMeeting({ onCreateMeeting, onJoinMeeting }: CreateMeetingProps) {
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [isInstant, setIsInstant] = useState(true);
  const [generatedMeetingId, setGeneratedMeetingId] = useState('');
  
  const { toast } = useToast();

  const generateMeetingId = () => {
    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setGeneratedMeetingId(id);
    return id;
  };

  const handleCreateInstantMeeting = () => {
    if (!meetingTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a meeting title.",
        variant: "destructive"
      });
      return;
    }

    const meetingId = generateMeetingId();
    const meetingData: MeetingData = {
      title: meetingTitle,
      description: meetingDescription,
      isInstant: true
    };

    onCreateMeeting(meetingData);
    toast({
      title: "Meeting Created",
      description: "Your instant meeting has been created!",
    });
  };

  const handleScheduleMeeting = () => {
    if (!meetingTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a meeting title.",
        variant: "destructive"
      });
      return;
    }

    if (!scheduledDate) {
      toast({
        title: "Date Required",
        description: "Please select a meeting date.",
        variant: "destructive"
      });
      return;
    }

    if (!scheduledTime) {
      toast({
        title: "Time Required",
        description: "Please select a meeting time.",
        variant: "destructive"
      });
      return;
    }

    const meetingId = generateMeetingId();
    const meetingDateTime = new Date(scheduledDate);
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    meetingDateTime.setHours(hours, minutes, 0, 0);

    const meetingData: MeetingData = {
      title: meetingTitle,
      description: meetingDescription,
      scheduledTime: meetingDateTime,
      duration: duration,
      isInstant: false
    };

    onCreateMeeting(meetingData);
    toast({
      title: "Meeting Scheduled",
      description: `Meeting scheduled for ${meetingDateTime.toLocaleDateString()} at ${meetingDateTime.toLocaleTimeString()}`,
    });
  };

  const handleJoinMeeting = () => {
    if (!generatedMeetingId.trim()) {
      toast({
        title: "Meeting ID Required",
        description: "Please enter a meeting ID to join.",
        variant: "destructive"
      });
      return;
    }

    onJoinMeeting(generatedMeetingId);
  };

  const copyMeetingLink = () => {
    if (generatedMeetingId) {
      const meetingLink = `${window.location.origin}/meet/${generatedMeetingId}`;
      navigator.clipboard.writeText(meetingLink);
      toast({
        title: "Link Copied",
        description: "Meeting link copied to clipboard!",
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Video className="h-5 w-5" />
            <span>MEA Meet</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Meeting Type Toggle */}
          <div className="flex space-x-2">
            <Button
              variant={isInstant ? "default" : "outline"}
              onClick={() => setIsInstant(true)}
              className="flex-1"
            >
              <Video className="h-4 w-4 mr-2" />
              Start Instant Meeting
            </Button>
            <Button
              variant={!isInstant ? "default" : "outline"}
              onClick={() => setIsInstant(false)}
              className="flex-1"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
          </div>

          {/* Meeting Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Meeting Title</Label>
              <Input
                id="title"
                placeholder="Enter meeting title..."
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Enter meeting description..."
                value={meetingDescription}
                onChange={(e) => setMeetingDescription(e.target.value)}
                rows={3}
              />
            </div>

            {!isInstant && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={scheduledDate ? scheduledDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => setScheduledDate(e.target.value ? new Date(e.target.value) : undefined)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    max="480"
                    step="15"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  />
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            {isInstant ? (
              <Button onClick={handleCreateInstantMeeting} className="flex-1">
                <Video className="h-4 w-4 mr-2" />
                Start Meeting
              </Button>
            ) : (
              <Button onClick={handleScheduleMeeting} className="flex-1">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
            )}
          </div>

          {/* Meeting ID Section */}
          {generatedMeetingId && (
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span className="font-medium">Meeting ID: {generatedMeetingId}</span>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyMeetingLink}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleJoinMeeting}
                  className="flex-1"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Join Meeting
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
