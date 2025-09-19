import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Phone, 
  PhoneOff, 
  Monitor, 
  MonitorOff,
  Users,
  Settings,
  MoreVertical,
  Share2,
  MessageCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  stream?: MediaStream;
}

interface MEAMeetInterfaceProps {
  meetingId: string;
  meetingName: string;
  isHost: boolean;
  onLeave: () => void;
  onEnd?: () => void;
}

export function MEAMeetInterface({
  meetingId,
  meetingName,
  isHost,
  onLeave,
  onEnd
}: MEAMeetInterfaceProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, any>>(new Map());
  const { toast } = useToast();

  // Initialize meeting
  useEffect(() => {
    initializeMeeting();
    return () => {
      cleanup();
    };
  }, []);

  const initializeMeeting = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Add current user as participant
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        const currentUser: Participant = {
          id: user.id,
          name: profile?.full_name || 'You',
          avatar: profile?.avatar_url,
          isMuted: false,
          isVideoOff: false,
          isScreenSharing: false,
          stream: stream
        };

        setParticipants([currentUser]);
      }

      // Join meeting room (simulate with Supabase realtime)
      await joinMeetingRoom();
      
      setIsConnecting(false);
      toast({
        title: "Joined Meeting",
        description: `Welcome to ${meetingName}`,
      });
    } catch (error) {
      console.error('Failed to initialize meeting:', error);
      toast({
        title: "Meeting Error",
        description: "Failed to join meeting. Please check your camera and microphone permissions.",
        variant: "destructive"
      });
      onLeave();
    }
  };

  const joinMeetingRoom = async () => {
    // Subscribe to meeting updates
    const channel = supabase.channel(`meeting-${meetingId}`);
    
    channel
      .on('broadcast', { event: 'participant-joined' }, (payload) => {
        handleParticipantJoined(payload.participant);
      })
      .on('broadcast', { event: 'participant-left' }, (payload) => {
        handleParticipantLeft(payload.participantId);
      })
      .on('broadcast', { event: 'participant-updated' }, (payload) => {
        handleParticipantUpdated(payload.participant);
      })
      .subscribe();

    // Notify others that we joined
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      channel.send({
        type: 'broadcast',
        event: 'participant-joined',
        payload: {
          participant: {
            id: user.id,
            name: profile?.full_name || 'Unknown User',
            avatar: profile?.avatar_url,
            isMuted: false,
            isVideoOff: false,
            isScreenSharing: false
          }
        }
      });
    }
  };

  const handleParticipantJoined = (participant: Participant) => {
    setParticipants(prev => {
      const exists = prev.find(p => p.id === participant.id);
      if (exists) return prev;
      return [...prev, participant];
    });
  };

  const handleParticipantLeft = (participantId: string) => {
    setParticipants(prev => prev.filter(p => p.id !== participantId));
    peersRef.current.delete(participantId);
  };

  const handleParticipantUpdated = (participant: Participant) => {
    setParticipants(prev => 
      prev.map(p => p.id === participant.id ? { ...p, ...participant } : p)
    );
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        
        // Notify other participants
        notifyParticipantUpdate({ isMuted: !audioTrack.enabled });
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        
        // Notify other participants
        notifyParticipantUpdate({ isVideoOff: !videoTrack.enabled });
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
        }
        
        // Switch back to camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        setIsScreenSharing(false);
        notifyParticipantUpdate({ isScreenSharing: false });
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        screenStreamRef.current = screenStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        setIsScreenSharing(true);
        notifyParticipantUpdate({ isScreenSharing: true });
        
        // Handle screen share end
        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };
      }
    } catch (error) {
      console.error('Screen share error:', error);
      toast({
        title: "Screen Share Error",
        description: "Failed to start screen sharing",
        variant: "destructive"
      });
    }
  };

  const notifyParticipantUpdate = (updates: Partial<Participant>) => {
    const channel = supabase.channel(`meeting-${meetingId}`);
    const { data: { user } } = supabase.auth.getUser();
    
    if (user) {
      channel.send({
        type: 'broadcast',
        event: 'participant-updated',
        payload: {
          participant: {
            id: user.id,
            ...updates
          }
        }
      });
    }
  };

  const handleLeave = () => {
    cleanup();
    onLeave();
  };

  const handleEnd = () => {
    if (isHost) {
      // Notify all participants that meeting ended
      const channel = supabase.channel(`meeting-${meetingId}`);
      channel.send({
        type: 'broadcast',
        event: 'meeting-ended',
        payload: {}
      });
    }
    cleanup();
    onEnd?.();
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Notify others that we left
    const channel = supabase.channel(`meeting-${meetingId}`);
    const { data: { user } } = supabase.auth.getUser();
    
    if (user) {
      channel.send({
        type: 'broadcast',
        event: 'participant-left',
        payload: { participantId: user.id }
      });
    }
  };

  const copyMeetingLink = () => {
    const meetingLink = `${window.location.origin}/meet/${meetingId}`;
    navigator.clipboard.writeText(meetingLink);
    toast({
      title: "Meeting Link Copied",
      description: "Share this link to invite others to the meeting",
    });
  };

  if (isConnecting) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Joining Meeting</h2>
          <p className="text-muted-foreground">Connecting to {meetingName}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div>
          <h1 className="text-lg font-semibold">{meetingName}</h1>
          <p className="text-sm text-muted-foreground">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyMeetingLink}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowParticipants(!showParticipants)}>
            <Users className="h-4 w-4 mr-2" />
            Participants
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowChat(!showChat)}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Chat
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Grid */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full">
            {participants.map((participant) => (
              <Card key={participant.id} className="relative overflow-hidden">
                <CardContent className="p-0 aspect-video">
                  {participant.isVideoOff ? (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={participant.avatar} />
                        <AvatarFallback>
                          {participant.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  ) : (
                    <video
                      autoPlay
                      playsInline
                      muted={participant.id === participants[0]?.id}
                      className="w-full h-full object-cover"
                      ref={participant.id === participants[0]?.id ? localVideoRef : undefined}
                    />
                  )}
                  
                  {/* Participant Info Overlay */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="bg-black/70 text-white px-2 py-1 rounded text-sm flex items-center gap-2">
                      <span className="truncate">{participant.name}</span>
                      {participant.isMuted && <MicOff className="h-3 w-3" />}
                      {participant.isScreenSharing && <Monitor className="h-3 w-3" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        {(showParticipants || showChat) && (
          <div className="w-80 border-l border-border bg-card">
            {showParticipants && (
              <div className="p-4">
                <h3 className="font-semibold mb-4">Participants ({participants.length})</h3>
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={participant.avatar} />
                        <AvatarFallback>
                          {participant.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{participant.name}</p>
                        <div className="flex items-center gap-1">
                          {participant.isMuted && <MicOff className="h-3 w-3 text-muted-foreground" />}
                          {participant.isVideoOff && <VideoOff className="h-3 w-3 text-muted-foreground" />}
                          {participant.isScreenSharing && <Monitor className="h-3 w-3 text-muted-foreground" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {showChat && (
              <div className="p-4">
                <h3 className="font-semibold mb-4">Meeting Chat</h3>
                <div className="text-center text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2" />
                  <p>Chat feature coming soon!</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-4 border-t border-border bg-card">
        <Button
          variant={isMuted ? "destructive" : "outline"}
          size="icon"
          onClick={toggleMute}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        
        <Button
          variant={isVideoOff ? "destructive" : "outline"}
          size="icon"
          onClick={toggleVideo}
        >
          {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>
        
        <Button
          variant={isScreenSharing ? "default" : "outline"}
          size="icon"
          onClick={toggleScreenShare}
        >
          {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
        </Button>
        
        <div className="w-px h-8 bg-border" />
        
        <Button
          variant="destructive"
          size="icon"
          onClick={isHost ? handleEnd : handleLeave}
        >
          {isHost ? <PhoneOff className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}
