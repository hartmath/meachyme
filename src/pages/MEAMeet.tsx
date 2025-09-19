import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MEAMeetInterface } from '@/components/MEAMeetInterface';
import { Loading } from '@/components/Loading';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function MEAMeet() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (meetingId) {
      loadMeeting();
    } else {
      navigate('/');
    }
  }, [meetingId]);

  const loadMeeting = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to join the meeting",
          variant: "destructive"
        });
        navigate('/auth');
        return;
      }

      // Get meeting details
      const { data: meetingData, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .eq('is_active', true)
        .single();

      if (error || !meetingData) {
        toast({
          title: "Meeting Not Found",
          description: "This meeting doesn't exist or has ended",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      setMeeting(meetingData);
      setIsHost(meetingData.host_id === user.id);

      // Add user as participant if not already
      const { error: participantError } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: meetingId,
          user_id: user.id,
          joined_at: new Date().toISOString()
        });

      if (participantError) {
        // User might already be a participant, continue anyway
        console.warn('Participant error:', participantError);
      }

      // Update participant count
      await supabase
        .from('meetings')
        .update({ participant_count: meetingData.participant_count + 1 })
        .eq('id', meetingId);

    } catch (error) {
      console.error('Failed to load meeting:', error);
      toast({
        title: "Error",
        description: "Failed to load meeting",
        variant: "destructive"
      });
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeave = () => {
    navigate('/');
  };

  const handleEnd = async () => {
    try {
      // End the meeting
      await supabase
        .from('meetings')
        .update({ is_active: false })
        .eq('id', meetingId);
    } catch (error) {
      console.error('Failed to end meeting:', error);
    }
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loading />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Meeting Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This meeting doesn't exist or has ended.
          </p>
          <button
            onClick={() => navigate('/')}
            className="text-primary hover:underline"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <MEAMeetInterface
      meetingId={meetingId!}
      meetingName={meeting.name}
      isHost={isHost}
      onLeave={handleLeave}
      onEnd={isHost ? handleEnd : undefined}
    />
  );
}
