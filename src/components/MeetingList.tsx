import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  Calendar, 
  Clock, 
  Users, 
  Play,
  Trash2,
  Edit,
  Copy
} from 'lucide-react';
// import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Meeting {
  id: string;
  title: string;
  description?: string;
  scheduledTime?: Date;
  duration: number;
  isInstant: boolean;
  status: 'scheduled' | 'ongoing' | 'completed';
  participants: number;
  createdAt: Date;
}

interface MeetingListProps {
  onJoinMeeting: (meetingId: string) => void;
  onEditMeeting: (meeting: Meeting) => void;
  onDeleteMeeting: (meetingId: string) => void;
}

export function MeetingList({ onJoinMeeting, onEditMeeting, onDeleteMeeting }: MeetingListProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'ongoing' | 'completed'>('all');
  
  const { toast } = useToast();

  // Load meetings from localStorage (in a real app, this would be from a database)
  useEffect(() => {
    const savedMeetings = localStorage.getItem('mea-meet-meetings');
    if (savedMeetings) {
      const parsedMeetings = JSON.parse(savedMeetings).map((meeting: any) => ({
        ...meeting,
        scheduledTime: meeting.scheduledTime ? new Date(meeting.scheduledTime) : undefined,
        createdAt: new Date(meeting.createdAt)
      }));
      setMeetings(parsedMeetings);
    }
  }, []);

  const filteredMeetings = meetings.filter(meeting => {
    if (filter === 'all') return true;
    return meeting.status === filter;
  });

  const getMeetingStatus = (meeting: Meeting) => {
    if (meeting.isInstant) return 'ongoing';
    if (!meeting.scheduledTime) return 'scheduled';
    if (meeting.scheduledTime < new Date()) return 'completed';
    return 'scheduled';
  };

  const getStatusBadge = (meeting: Meeting) => {
    const status = getMeetingStatus(meeting);
    const variants = {
      scheduled: 'default',
      ongoing: 'destructive',
      completed: 'secondary'
    } as const;

    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTimeDisplay = (meeting: Meeting) => {
    if (meeting.isInstant) {
      return 'Instant Meeting';
    }
    
    if (!meeting.scheduledTime) {
      return 'No time set';
    }

    const date = meeting.scheduledTime;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  const copyMeetingLink = (meetingId: string) => {
    const meetingLink = `${window.location.origin}/meet/${meetingId}`;
    navigator.clipboard.writeText(meetingLink);
    toast({
      title: "Link Copied",
      description: "Meeting link copied to clipboard!",
    });
  };

  const handleJoinMeeting = (meeting: Meeting) => {
    onJoinMeeting(meeting.id);
  };

  const handleDeleteMeeting = (meetingId: string) => {
    const updatedMeetings = meetings.filter(m => m.id !== meetingId);
    setMeetings(updatedMeetings);
    localStorage.setItem('mea-meet-meetings', JSON.stringify(updatedMeetings));
    onDeleteMeeting(meetingId);
    toast({
      title: "Meeting Deleted",
      description: "The meeting has been deleted.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex space-x-2">
        {(['all', 'scheduled', 'ongoing', 'completed'] as const).map((filterType) => (
          <Button
            key={filterType}
            variant={filter === filterType ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(filterType)}
          >
            {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
          </Button>
        ))}
      </div>

      {/* Meetings List */}
      <div className="space-y-4">
        {filteredMeetings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Video className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No meetings found</h3>
              <p className="text-muted-foreground text-center">
                {filter === 'all' 
                  ? "You haven't created any meetings yet. Start by creating your first meeting!"
                  : `No ${filter} meetings found.`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredMeetings.map((meeting) => (
            <Card key={meeting.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold">{meeting.title}</h3>
                      {getStatusBadge(meeting)}
                    </div>
                    
                    {meeting.description && (
                      <p className="text-muted-foreground">{meeting.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{getTimeDisplay(meeting)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{meeting.duration} minutes</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{meeting.participants} participants</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyMeetingLink(meeting.id)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    
                    {!meeting.isInstant && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditMeeting(meeting)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteMeeting(meeting.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      onClick={() => handleJoinMeeting(meeting)}
                      size="sm"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Join
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
