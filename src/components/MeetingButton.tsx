import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Video, 
  VideoOff,
  Users,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface MeetingButtonProps {
  chatId?: string;
  chatType?: 'direct' | 'group';
  chatName?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

export function MeetingButton({ 
  chatId, 
  chatType = 'direct', 
  chatName = 'Meeting',
  className,
  variant = 'outline',
  size = 'sm'
}: MeetingButtonProps) {
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleStartMeeting = async () => {
    setIsCreating(true);
    
    try {
      // Generate a meeting ID
      const meetingId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Create meeting data
      const meetingData = {
        id: meetingId,
        title: `${chatName} Meeting`,
        description: `Meeting for ${chatType === 'group' ? 'group' : 'direct'} chat`,
        isInstant: true,
        status: 'ongoing',
        participants: 1,
        createdAt: new Date().toISOString(),
        chatId: chatId,
        chatType: chatType
      };

      // Save to localStorage (in a real app, save to database)
      const existingMeetings = JSON.parse(localStorage.getItem('mea-meet-meetings') || '[]');
      existingMeetings.push(meetingData);
      localStorage.setItem('mea-meet-meetings', JSON.stringify(existingMeetings));

      // Navigate to meeting
      navigate(`/meet/${meetingId}`);
      
      toast({
        title: "Meeting Started",
        description: `Started a meeting for ${chatName}`,
      });

    } catch (error) {
      console.error('Error starting meeting:', error);
      toast({
        title: "Meeting Error",
        description: "Failed to start meeting. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button
      onClick={handleStartMeeting}
      disabled={isCreating}
      variant={variant}
      size={size}
      className={className}
    >
      <Video className="h-4 w-4 mr-2" />
      {isCreating ? 'Starting...' : 'Start Meeting'}
    </Button>
  );
}

// Meeting status indicator component
interface MeetingStatusProps {
  chatId?: string;
  chatType?: 'direct' | 'group';
}

export function MeetingStatus({ chatId, chatType }: MeetingStatusProps) {
  const [hasActiveMeeting, setHasActiveMeeting] = useState(false);

  // Check for active meetings for this chat
  useState(() => {
    const meetings = JSON.parse(localStorage.getItem('mea-meet-meetings') || '[]');
    const activeMeeting = meetings.find((meeting: any) => 
      meeting.chatId === chatId && 
      meeting.chatType === chatType && 
      meeting.status === 'ongoing'
    );
    setHasActiveMeeting(!!activeMeeting);
  });

  if (!hasActiveMeeting) return null;

  return (
    <div className="flex items-center space-x-1 text-xs text-green-600">
      <Video className="h-3 w-3" />
      <span>Meeting Active</span>
    </div>
  );
}
