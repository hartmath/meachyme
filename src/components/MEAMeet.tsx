import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  Users, 
  Share2, 
  MessageCircle,
  ScreenShare,
  ScreenShareOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WebRTCManager, generateUserId } from '@/utils/webrtc';

interface MEAMeetProps {
  meetingId?: string;
  onLeave: () => void;
  isHost?: boolean;
}

export function MEAMeet({ meetingId, onLeave, isHost = false }: MEAMeetProps) {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [meetingLink, setMeetingLink] = useState('');
  const [showChat, setShowChat] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);
  
  const { toast } = useToast();

  // Initialize meeting
  useEffect(() => {
    if (meetingId) {
      setMeetingLink(`${window.location.origin}/meet/${meetingId}`);
      initializeMeeting();
    }

    return () => {
      // Cleanup on unmount
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.leaveMeeting();
      }
    };
  }, [meetingId]);

  const initializeMeeting = async () => {
    try {
      const userId = generateUserId();
      webrtcManagerRef.current = new WebRTCManager(meetingId!, userId);
      
      // Initialize peer connection
      await webrtcManagerRef.current.initializePeerConnection();
      
      // Start local stream
      const stream = await webrtcManagerRef.current.startLocalStream();
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Join the meeting
      await webrtcManagerRef.current.joinMeeting();

      toast({
        title: "Meeting Started",
        description: "Your MEA Meet session is now active!",
      });

    } catch (error) {
      console.error('Error initializing meeting:', error);
      toast({
        title: "Meeting Error",
        description: "Failed to start meeting. Please check your camera and microphone permissions.",
        variant: "destructive"
      });
    }
  };

  const toggleVideo = () => {
    if (webrtcManagerRef.current) {
      const isEnabled = webrtcManagerRef.current.toggleVideo();
      setIsVideoOn(isEnabled);
    }
  };

  const toggleAudio = () => {
    if (webrtcManagerRef.current) {
      const isEnabled = webrtcManagerRef.current.toggleAudio();
      setIsAudioOn(isEnabled);
    }
  };

  const toggleScreenShare = async () => {
    if (webrtcManagerRef.current) {
      try {
        const success = await webrtcManagerRef.current.toggleScreenShare();
        if (success) {
          setIsScreenSharing(!isScreenSharing);
        }
      } catch (error) {
        console.error('Error sharing screen:', error);
        toast({
          title: "Screen Share Error",
          description: "Failed to start screen sharing.",
          variant: "destructive"
        });
      }
    }
  };

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(meetingLink);
    toast({
      title: "Link Copied",
      description: "Meeting link copied to clipboard!",
    });
  };

  const leaveMeeting = () => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.leaveMeeting();
    }
    onLeave();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">MEA Meet</h1>
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <Users className="h-4 w-4" />
            <span>{participants.length + 1} participants</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChat(!showChat)}
            className="text-white hover:bg-gray-700"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyMeetingLink}
            className="text-white hover:bg-gray-700"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative bg-gray-800">
            {/* Remote Video */}
            <video
              id="remoteVideo"
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Local Video */}
            <div className="absolute bottom-4 right-4 w-64 h-48 bg-gray-700 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-4 p-4 bg-gray-800">
            <Button
              onClick={toggleAudio}
              variant={isAudioOn ? "default" : "destructive"}
              size="lg"
              className="rounded-full w-12 h-12"
            >
              {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            
            <Button
              onClick={toggleVideo}
              variant={isVideoOn ? "default" : "destructive"}
              size="lg"
              className="rounded-full w-12 h-12"
            >
              {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
            
            <Button
              onClick={toggleScreenShare}
              variant={isScreenSharing ? "default" : "outline"}
              size="lg"
              className="rounded-full w-12 h-12"
            >
              {isScreenSharing ? <ScreenShareOff className="h-5 w-5" /> : <ScreenShare className="h-5 w-5" />}
            </Button>
            
            <Button
              onClick={leaveMeeting}
              variant="destructive"
              size="lg"
              className="rounded-full w-12 h-12"
            >
              <Phone className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold">Meeting Chat</h3>
            </div>
            <div className="flex-1 p-4">
              <div className="text-sm text-gray-400 text-center">
                Chat functionality coming soon...
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
