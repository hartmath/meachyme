import { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Users, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { GroupWebRTCManager, GroupCallType, GroupParticipant } from "@/utils/groupWebRTC";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface GroupCallInterfaceProps {
  callId: string;
  groupId: string;
  groupName: string;
  callType: GroupCallType;
  isInitiator?: boolean;
  onCallEnd: () => void;
}

export function GroupCallInterface({
  callId,
  groupId,
  groupName,
  callType,
  isInitiator = false,
  onCallEnd
}: GroupCallInterfaceProps) {
  const { toast } = useToast();
  const [groupWebRTC] = useState(() => new GroupWebRTCManager());
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const participantVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const callStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let durationInterval: NodeJS.Timeout;

    if (isCallActive && callStartTimeRef.current) {
      durationInterval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current!) / 1000));
      }, 1000);
    }

    return () => {
      if (durationInterval) {
        clearInterval(durationInterval);
      }
    };
  }, [isCallActive]);

  useEffect(() => {
    // Set up WebRTC callbacks
    groupWebRTC.setCallbacks({
      onLocalStream: (stream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      },
      onParticipantStream: (userId, stream) => {
        const videoElement = participantVideoRefs.current.get(userId);
        if (videoElement) {
          videoElement.srcObject = stream;
        }
      },
      onParticipantJoined: (participant) => {
        setParticipants(prev => [...prev, participant]);
        toast({
          title: "Participant joined",
          description: `${participant.userName} joined the call`,
        });
      },
      onParticipantLeft: (userId) => {
        setParticipants(prev => prev.filter(p => p.userId !== userId));
        participantVideoRefs.current.delete(userId);
      },
      onCallEnd: () => {
        handleCallEnd();
      },
      onError: (error) => {
        toast({
          title: "Call Error",
          description: error,
          variant: "destructive"
        });
      }
    });

    // Initialize or join the call
    if (isInitiator) {
      initializeCall();
    } else {
      joinCall();
    }

    return () => {
      groupWebRTC.endCall();
    };
  }, []);

  const initializeCall = async () => {
    try {
      await groupWebRTC.initializeGroupCall(groupId, callType);
      setIsCallActive(true);
      callStartTimeRef.current = Date.now();
    } catch (error) {
      console.error('Failed to initialize call:', error);
      onCallEnd();
    }
  };

  const joinCall = async () => {
    try {
      await groupWebRTC.joinGroupCall(callId);
      setIsCallActive(true);
      callStartTimeRef.current = Date.now();
    } catch (error) {
      console.error('Failed to join call:', error);
      onCallEnd();
    }
  };

  const handleCallEnd = () => {
    groupWebRTC.endCall();
    onCallEnd();
  };

  const toggleMute = () => {
    const newMutedState = groupWebRTC.toggleAudio();
    setIsMuted(!newMutedState);
  };

  const toggleVideo = () => {
    if (callType === 'video') {
      const newVideoState = groupWebRTC.toggleVideo();
      setIsVideoOff(!newVideoState);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  const getParticipantVideoRef = (userId: string) => (ref: HTMLVideoElement | null) => {
    if (ref) {
      participantVideoRefs.current.set(userId, ref);
    } else {
      participantVideoRefs.current.delete(userId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-white font-semibold">{groupName}</h1>
              <p className="text-white/70 text-sm">
                {callType === 'video' ? 'MEA Meet' : 'Voice call'} • {participants.length + 1} participants
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              {formatDuration(callDuration)}
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="h-full pt-20 pb-24">
        {callType === 'video' ? (
          <div className="h-full p-4">
            {participants.length === 0 ? (
              // Only local video when no other participants
              <div className="h-full flex items-center justify-center">
                <div className="relative w-full max-w-md aspect-video bg-muted rounded-lg overflow-hidden">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                    You
                  </div>
                </div>
              </div>
            ) : (
              // Grid layout for multiple participants
              <div className={`grid gap-4 h-full ${
                participants.length <= 2 ? 'grid-cols-1' :
                participants.length <= 4 ? 'grid-cols-2' :
                'grid-cols-3'
              }`}>
                {/* Local video */}
                <div className="relative bg-muted rounded-lg overflow-hidden">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                    You
                  </div>
                </div>

                {/* Participant videos */}
                {participants.map((participant) => (
                  <div key={participant.userId} className="relative bg-muted rounded-lg overflow-hidden">
                    <video
                      ref={getParticipantVideoRef(participant.userId)}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                      {participant.userName}
                    </div>
                    {!participant.isActive && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={participant.userAvatar} alt={participant.userName} />
                          <AvatarFallback>{getInitials(participant.userName)}</AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Voice call layout
          <div className="h-full flex flex-col items-center justify-center space-y-6">
            <div className="w-32 h-32 bg-primary rounded-full flex items-center justify-center">
              <Users className="h-16 w-16 text-primary-foreground" />
            </div>
            
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-foreground mb-2">{groupName}</h2>
              <p className="text-muted-foreground">
                {participants.length + 1} participants in voice call
              </p>
            </div>

            {/* Participants list */}
            <div className="flex flex-wrap justify-center gap-3 max-w-md">
              <div className="flex items-center space-x-2 bg-card p-2 rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    You
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">You</span>
              </div>
              
              {participants.map((participant) => (
                <div key={participant.userId} className="flex items-center space-x-2 bg-card p-2 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={participant.userAvatar} alt={participant.userName} />
                    <AvatarFallback>{getInitials(participant.userName)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{participant.userName}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center justify-center space-x-4 p-4">
          <Button
            size="icon"
            variant={isMuted ? "destructive" : "secondary"}
            onClick={toggleMute}
            className="h-12 w-12"
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          {callType === 'video' && (
            <Button
              size="icon"
              variant={isVideoOff ? "destructive" : "secondary"}
              onClick={toggleVideo}
              className="h-12 w-12"
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
          )}

          <Button
            size="icon"
            variant="destructive"
            onClick={handleCallEnd}
            className="h-12 w-12"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
