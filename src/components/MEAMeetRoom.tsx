import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  Users, 
  Clock, 
  Copy, 
  Share2, 
  Calendar,
  UserPlus,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MeetingRoom {
  id: string;
  name: string;
  description?: string;
  host_id: string;
  host_name: string;
  created_at: string;
  is_active: boolean;
  participant_count: number;
}

interface MEAMeetRoomProps {
  onJoinMeeting: (meetingId: string, meetingName: string, isHost: boolean) => void;
  onClose: () => void;
}

export function MEAMeetRoom({ onJoinMeeting, onClose }: MEAMeetRoomProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [meetingName, setMeetingName] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [recentMeetings, setRecentMeetings] = useState<MeetingRoom[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRecentMeetings();
  }, []);

  const loadRecentMeetings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get meetings where user is host or participant
      const { data: meetings, error } = await supabase
        .from('meetings')
        .select(`
          *,
          profiles!meetings_host_id_fkey(full_name)
        `)
        .or(`host_id.eq.${user.id},participants.user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setRecentMeetings(meetings?.map(meeting => ({
        id: meeting.id,
        name: meeting.name,
        description: meeting.description,
        host_id: meeting.host_id,
        host_name: meeting.profiles?.full_name || 'Unknown',
        created_at: meeting.created_at,
        is_active: meeting.is_active,
        participant_count: meeting.participant_count || 0
      })) || []);
    } catch (error) {
      console.error('Failed to load recent meetings:', error);
    }
  };

  const createMeeting = async () => {
    if (!meetingName.trim()) {
      toast({
        title: "Meeting Name Required",
        description: "Please enter a meeting name",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to create a meeting",
          variant: "destructive"
        });
        return;
      }

      const meetingId = generateMeetingId();
      
      // First, try to create the meeting
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .insert({
          id: meetingId,
          name: meetingName.trim(),
          description: meetingDescription.trim() || null,
          host_id: user.id,
          is_active: true,
          participant_count: 0
        })
        .select()
        .single();

      if (meetingError) {
        console.error('Meeting creation error:', meetingError);
        throw new Error(`Failed to create meeting: ${meetingError.message}`);
      }

      // Then add host as participant
      const { error: participantError } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: meetingId,
          user_id: user.id,
          joined_at: new Date().toISOString()
        });

      if (participantError) {
        console.error('Participant creation error:', participantError);
        // Don't throw here, the meeting was created successfully
        console.warn('Failed to add host as participant, but meeting was created');
      }

      toast({
        title: "Meeting Created",
        description: `Meeting "${meetingName}" is ready`,
      });

      onJoinMeeting(meetingId, meetingName, true);
    } catch (error) {
      console.error('Failed to create meeting:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Failed to Create Meeting",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const joinMeeting = async () => {
    if (!joinCode.trim()) {
      toast({
        title: "Meeting Code Required",
        description: "Please enter a meeting code",
        variant: "destructive"
      });
      return;
    }

    setIsJoining(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if meeting exists
      const { data: meeting, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', joinCode.trim())
        .eq('is_active', true)
        .single();

      if (error || !meeting) {
        throw new Error('Meeting not found or has ended');
      }

      // Add user as participant
      const { error: participantError } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: meeting.id,
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
        .update({ participant_count: meeting.participant_count + 1 })
        .eq('id', meeting.id);

      toast({
        title: "Joined Meeting",
        description: `Welcome to "${meeting.name}"`,
      });

      onJoinMeeting(meeting.id, meeting.name, false);
    } catch (error) {
      console.error('Failed to join meeting:', error);
      toast({
        title: "Failed to Join Meeting",
        description: error instanceof Error ? error.message : "Please check the meeting code",
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };

  const joinRecentMeeting = (meeting: MeetingRoom) => {
    onJoinMeeting(meeting.id, meeting.name, false);
  };

  const copyMeetingLink = (meetingId: string) => {
    const meetingLink = `${window.location.origin}/meet/${meetingId}`;
    navigator.clipboard.writeText(meetingLink);
    toast({
      title: "Meeting Link Copied",
      description: "Share this link to invite others",
    });
  };

  const generateMeetingId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-6 w-6" />
                MEA Meet
              </CardTitle>
              <CardDescription>
                Create or join a video conference
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              ×
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'create' ? 'default' : 'outline'}
              onClick={() => setActiveTab('create')}
              className="flex-1"
            >
              <Video className="h-4 w-4 mr-2" />
              Create Meeting
            </Button>
            <Button
              variant={activeTab === 'join' ? 'default' : 'outline'}
              onClick={() => setActiveTab('join')}
              className="flex-1"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Join Meeting
            </Button>
          </div>

          {/* Create Meeting Tab */}
          {activeTab === 'create' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="meeting-name">Meeting Name</Label>
                <Input
                  id="meeting-name"
                  placeholder="Enter meeting name"
                  value={meetingName}
                  onChange={(e) => setMeetingName(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="meeting-description">Description (Optional)</Label>
                <Textarea
                  id="meeting-description"
                  placeholder="Enter meeting description"
                  value={meetingDescription}
                  onChange={(e) => setMeetingDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <Button 
                onClick={createMeeting} 
                disabled={isCreating}
                className="w-full"
              >
                {isCreating ? 'Creating...' : 'Create Meeting'}
              </Button>
            </div>
          )}

          {/* Join Meeting Tab */}
          {activeTab === 'join' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="join-code">Meeting Code</Label>
                <Input
                  id="join-code"
                  placeholder="Enter meeting code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
              </div>

              <Button 
                onClick={joinMeeting} 
                disabled={isJoining}
                className="w-full"
              >
                {isJoining ? 'Joining...' : 'Join Meeting'}
              </Button>
            </div>
          )}

          {/* Recent Meetings */}
          {recentMeetings.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Meetings
              </h3>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {recentMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{meeting.name}</h4>
                        {meeting.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Host: {meeting.host_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(meeting.created_at)} • {meeting.participant_count} participants
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyMeetingLink(meeting.id)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      {meeting.is_active && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => joinRecentMeeting(meeting)}
                        >
                          Join
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="border-t border-border pt-4">
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Calendar className="h-6 w-6" />
                <span className="text-sm">Schedule Meeting</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Settings className="h-6 w-6" />
                <span className="text-sm">Meeting Settings</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
