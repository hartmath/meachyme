import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Video, 
  Calendar, 
  Users, 
  Plus,
  ArrowLeft,
  Copy,
  Share2
} from 'lucide-react';
import { MEAMeet } from '@/components/MEAMeet';
import { CreateMeeting } from '@/components/CreateMeeting';
import { MeetingList } from '@/components/MeetingList';
import { useToast } from '@/hooks/use-toast';

interface MeetingData {
  title: string;
  description?: string;
  scheduledTime?: Date;
  duration?: number;
  isInstant: boolean;
}

export default function MEAMeetPage() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(meetingId || null);
  const [joinMeetingId, setJoinMeetingId] = useState('');
  const [meetings, setMeetings] = useState<any[]>([]);

  // Load meetings on component mount
  useEffect(() => {
    const savedMeetings = localStorage.getItem('mea-meet-meetings');
    if (savedMeetings) {
      setMeetings(JSON.parse(savedMeetings));
    }
  }, []);

  // If we have a meetingId in the URL, start the meeting
  useEffect(() => {
    if (meetingId && !isInMeeting) {
      setCurrentMeetingId(meetingId);
      setIsInMeeting(true);
    }
  }, [meetingId, isInMeeting]);

  const handleCreateMeeting = (meetingData: MeetingData) => {
    const newMeeting = {
      id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      ...meetingData,
      status: meetingData.isInstant ? 'ongoing' : 'scheduled',
      participants: 1,
      createdAt: new Date().toISOString()
    };

    const updatedMeetings = [...meetings, newMeeting];
    setMeetings(updatedMeetings);
    localStorage.setItem('mea-meet-meetings', JSON.stringify(updatedMeetings));

    // Start the meeting immediately
    setCurrentMeetingId(newMeeting.id);
    setIsInMeeting(true);
    
    // Update URL
    navigate(`/meet/${newMeeting.id}`);
  };

  const handleJoinMeeting = (meetingId: string) => {
    setCurrentMeetingId(meetingId);
    setIsInMeeting(true);
    navigate(`/meet/${meetingId}`);
  };

  const handleJoinByCode = () => {
    if (!joinMeetingId.trim()) {
      toast({
        title: "Meeting ID Required",
        description: "Please enter a meeting ID to join.",
        variant: "destructive"
      });
      return;
    }

    handleJoinMeeting(joinMeetingId);
  };

  const handleLeaveMeeting = () => {
    setIsInMeeting(false);
    setCurrentMeetingId(null);
    navigate('/meet');
  };

  const handleEditMeeting = (meeting: any) => {
    // In a real app, this would open an edit modal
    toast({
      title: "Edit Meeting",
      description: "Edit functionality coming soon!",
    });
  };

  const handleDeleteMeeting = (meetingId: string) => {
    const updatedMeetings = meetings.filter(m => m.id !== meetingId);
    setMeetings(updatedMeetings);
    localStorage.setItem('mea-meet-meetings', JSON.stringify(updatedMeetings));
  };

  const copyMeetingLink = () => {
    if (currentMeetingId) {
      const meetingLink = `${window.location.origin}/meet/${currentMeetingId}`;
      navigator.clipboard.writeText(meetingLink);
      toast({
        title: "Link Copied",
        description: "Meeting link copied to clipboard!",
      });
    }
  };

  // If we're in a meeting, show the meeting interface
  if (isInMeeting && currentMeetingId) {
    return (
      <MEAMeet
        meetingId={currentMeetingId}
        onLeave={handleLeaveMeeting}
        isHost={true}
      />
    );
  }

  // Main MEA Meet interface
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/chats')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Chats
              </Button>
              <div className="flex items-center space-x-2">
                <Video className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">MEA Meet</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyMeetingLink}
                disabled={!currentMeetingId}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Create Meeting</TabsTrigger>
            <TabsTrigger value="join">Join Meeting</TabsTrigger>
            <TabsTrigger value="meetings">My Meetings</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <CreateMeeting
              onCreateMeeting={handleCreateMeeting}
              onJoinMeeting={handleJoinMeeting}
            />
          </TabsContent>

          <TabsContent value="join" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Join a Meeting</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="meetingId">Meeting ID or Link</Label>
                  <Input
                    id="meetingId"
                    placeholder="Enter meeting ID or paste meeting link..."
                    value={joinMeetingId}
                    onChange={(e) => setJoinMeetingId(e.target.value)}
                  />
                </div>
                
                <Button onClick={handleJoinByCode} className="w-full">
                  <Video className="h-4 w-4 mr-2" />
                  Join Meeting
                </Button>
                
                <div className="text-center text-sm text-muted-foreground">
                  <p>You can join a meeting using:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Meeting ID (e.g., abc123def456)</li>
                    <li>Full meeting link</li>
                    <li>Meeting link shared by the host</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="meetings" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">My Meetings</h2>
              <Button onClick={() => navigate('/meet')}>
                <Plus className="h-4 w-4 mr-2" />
                New Meeting
              </Button>
            </div>
            
            <MeetingList
              onJoinMeeting={handleJoinMeeting}
              onEditMeeting={handleEditMeeting}
              onDeleteMeeting={handleDeleteMeeting}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
