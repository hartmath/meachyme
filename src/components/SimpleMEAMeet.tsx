import { useState } from 'react';
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

interface SimpleMEAMeetProps {
  meetingId?: string;
  onLeave: () => void;
  isHost?: boolean;
}

export function SimpleMEAMeet({ meetingId, onLeave, isHost = false }: SimpleMEAMeetProps) {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [meetingLink, setMeetingLink] = useState('');
  const [showChat, setShowChat] = useState(false);
  
  const { toast } = useToast();

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
    toast({
      title: isVideoOn ? "Video Off" : "Video On",
      description: `Video ${isVideoOn ? 'disabled' : 'enabled'}`,
    });
  };

  const toggleAudio = () => {
    setIsAudioOn(!isAudioOn);
    toast({
      title: isAudioOn ? "Audio Off" : "Audio On", 
      description: `Audio ${isAudioOn ? 'disabled' : 'enabled'}`,
    });
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    toast({
      title: isScreenSharing ? "Screen Share Stopped" : "Screen Share Started",
      description: `Screen sharing ${isScreenSharing ? 'stopped' : 'started'}`,
    });
  };

  const copyMeetingLink = () => {
    const link = `${window.location.origin}/meet/${meetingId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied",
      description: "Meeting link copied to clipboard!",
    });
  };

  const leaveMeeting = () => {
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
          <div className="flex-1 relative bg-gray-800 flex items-center justify-center">
            {/* Placeholder for video */}
            <div className="text-center">
              <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Video className="h-16 w-16 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">Video Meeting</h3>
              <p className="text-gray-400 text-sm">
                Meeting ID: {meetingId}
              </p>
              <p className="text-gray-500 text-xs mt-2">
                WebRTC functionality coming soon...
              </p>
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
