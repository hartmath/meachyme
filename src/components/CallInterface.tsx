import { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { WebRTCManager, CallType } from "@/utils/webrtc";

interface CallInterfaceProps {
  callId: string | null;
  recipientId: string | null;
  recipientName: string;
  recipientAvatar?: string;
  callType: CallType;
  isIncoming?: boolean;
  onCallEnd: () => void;
  onCallDecline?: () => void;
  onCallAnswer?: () => void;
}

export function CallInterface({
  callId,
  recipientId,
  recipientName,
  recipientAvatar,
  callType,
  isIncoming = false,
  onCallEnd,
  onCallDecline,
  onCallAnswer
}: CallInterfaceProps) {
  const { toast } = useToast();
  const [webrtc] = useState(() => new WebRTCManager());
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
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
    webrtc.setCallbacks({
      onLocalStream: (stream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      },
      onRemoteStream: (stream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
        setIsCallActive(true);
        callStartTimeRef.current = Date.now();
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

    // Auto-initiate call if not incoming
    if (!isIncoming && recipientId && callType) {
      initiateCall();
    }

    return () => {
      webrtc.endCall();
    };
  }, []);

  const initiateCall = async () => {
    if (!recipientId) return;
    
    try {
      await webrtc.initializeCall(recipientId, callType);
    } catch (error) {
      console.error('Failed to initiate call:', error);
      onCallEnd();
    }
  };

  const handleAnswerCall = async () => {
    if (!callId) return;
    
    try {
      await webrtc.answerCall(callId);
      onCallAnswer?.();
    } catch (error) {
      console.error('Failed to answer call:', error);
      toast({
        title: "Failed to answer call",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleDeclineCall = () => {
    if (callId) {
      webrtc.declineCall(callId);
    }
    onCallDecline?.();
  };

  const handleCallEnd = () => {
    webrtc.endCall();
    onCallEnd();
  };

  const toggleMute = () => {
    const newMutedState = webrtc.toggleAudio();
    setIsMuted(!newMutedState);
  };

  const toggleVideo = () => {
    if (callType === 'video') {
      const newVideoState = webrtc.toggleVideo();
      setIsVideoOff(!newVideoState);
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // Note: Speaker control would require additional audio context setup
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Video streams container */}
      {callType === 'video' && (
        <div className="relative w-full h-full">
          {/* Remote video (main) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* Local video (picture-in-picture) */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`absolute top-4 right-4 w-32 h-24 rounded-lg border-2 border-white object-cover ${
              isVideoOff ? 'hidden' : ''
            }`}
          />
          
          {/* Fallback for when video is off or not connected */}
          {(!isCallActive || isVideoOff) && (
            <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-primary/40 flex items-center justify-center">
              <div className="text-center">
                {recipientAvatar ? (
                  <img 
                    src={recipientAvatar} 
                    alt={recipientName}
                    className="w-32 h-32 rounded-full mx-auto mb-4"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-4xl font-bold mx-auto mb-4">
                    {getInitials(recipientName)}
                  </div>
                )}
                <h2 className="text-2xl font-bold text-white mb-2">{recipientName}</h2>
                <p className="text-white/80">
                  {!isCallActive ? (isIncoming ? 'Incoming call...' : 'Calling...') : `Call duration: ${formatDuration(callDuration)}`}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audio call interface */}
      {callType === 'voice' && (
        <div className="w-full h-full bg-gradient-to-b from-primary/20 to-primary/40 flex items-center justify-center">
          <div className="text-center">
            {recipientAvatar ? (
              <img 
                src={recipientAvatar} 
                alt={recipientName}
                className="w-40 h-40 rounded-full mx-auto mb-6"
              />
            ) : (
              <div className="w-40 h-40 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-5xl font-bold mx-auto mb-6">
                {getInitials(recipientName)}
              </div>
            )}
            <h2 className="text-3xl font-bold text-white mb-4">{recipientName}</h2>
            <p className="text-xl text-white/80">
              {!isCallActive ? (isIncoming ? 'Incoming voice call...' : 'Calling...') : formatDuration(callDuration)}
            </p>
          </div>
        </div>
      )}

      {/* Call controls */}
      <div className="absolute bottom-8 left-0 right-0">
        <div className="flex justify-center items-center space-x-6">
          {/* Incoming call controls */}
          {isIncoming && !isCallActive && (
            <>
              <Button
                size="lg"
                variant="outline"
                className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 border-white text-white"
                onClick={handleDeclineCall}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
              <Button
                size="lg"
                className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600"
                onClick={handleAnswerCall}
              >
                <Phone className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Active call controls */}
          {(isCallActive || (!isIncoming && callId)) && (
            <>
              {/* Mute button */}
              <Button
                size="lg"
                variant="outline"
                className={`h-14 w-14 rounded-full ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30'} border-white text-white`}
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>

              {/* Video toggle (only for video calls) */}
              {callType === 'video' && (
                <Button
                  size="lg"
                  variant="outline"
                  className={`h-14 w-14 rounded-full ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30'} border-white text-white`}
                  onClick={toggleVideo}
                >
                  {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </Button>
              )}

              {/* Speaker toggle (for voice calls) */}
              {callType === 'voice' && (
                <Button
                  size="lg"
                  variant="outline"
                  className={`h-14 w-14 rounded-full ${isSpeakerOn ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-500 hover:bg-gray-600'} border-white text-white`}
                  onClick={toggleSpeaker}
                >
                  {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </Button>
              )}

              {/* End call button */}
              <Button
                size="lg"
                className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600"
                onClick={handleCallEnd}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}