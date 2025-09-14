import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { WebRTCManager } from "@/utils/webrtc";
import { GroupWebRTCManager } from "@/utils/groupWebRTC";

export default function WebRTCTest() {
  const { toast } = useToast();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [webrtc] = useState(() => new WebRTCManager());
  const [groupWebRTC] = useState(() => new GroupWebRTCManager());
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const testMediaAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      toast({
        title: "Media Access Success",
        description: "Camera and microphone access granted",
      });
    } catch (error: any) {
      toast({
        title: "Media Access Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const testWebRTCConnection = async () => {
    try {
      webrtc.setCallbacks({
        onLocalStream: (stream) => {
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        },
        onRemoteStream: (stream) => {
          setRemoteStream(stream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
          setIsCallActive(true);
        },
        onCallEnd: () => {
          setIsCallActive(false);
          setLocalStream(null);
          setRemoteStream(null);
        },
        onError: (error) => {
          toast({
            title: "WebRTC Error",
            description: error,
            variant: "destructive"
          });
        }
      });

      // Test with a dummy recipient ID
      const callId = await webrtc.initializeCall("test-recipient-id", "video");
      
      toast({
        title: "WebRTC Test Started",
        description: `Call ID: ${callId}`,
      });
    } catch (error: any) {
      toast({
        title: "WebRTC Test Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const testGroupWebRTC = async () => {
    try {
      groupWebRTC.setCallbacks({
        onLocalStream: (stream) => {
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        },
        onParticipantStream: (userId, stream) => {
          setRemoteStream(stream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
          setIsCallActive(true);
        },
        onParticipantJoined: (participant) => {
          toast({
            title: "Participant Joined",
            description: `${participant.userName} joined the call`,
          });
        },
        onParticipantLeft: (userId) => {
          toast({
            title: "Participant Left",
            description: `User ${userId} left the call`,
          });
        },
        onCallEnd: () => {
          setIsCallActive(false);
          setLocalStream(null);
          setRemoteStream(null);
        },
        onError: (error) => {
          toast({
            title: "Group WebRTC Error",
            description: error,
            variant: "destructive"
          });
        }
      });

      // Test with a dummy group ID
      const callId = await groupWebRTC.initializeGroupCall("test-group-id", "video");
      
      toast({
        title: "Group WebRTC Test Started",
        description: `Call ID: ${callId}`,
      });
    } catch (error: any) {
      toast({
        title: "Group WebRTC Test Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const endCall = () => {
    webrtc.endCall();
    groupWebRTC.endCall();
    setIsCallActive(false);
    setLocalStream(null);
    setRemoteStream(null);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">WebRTC Test Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Local Video */}
          <div className="bg-card p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Local Video</h3>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-48 bg-muted rounded"
            />
            <p className="text-sm text-muted-foreground mt-2">
              {localStream ? "Stream active" : "No stream"}
            </p>
          </div>

          {/* Remote Video */}
          <div className="bg-card p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Remote Video</h3>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-48 bg-muted rounded"
            />
            <p className="text-sm text-muted-foreground mt-2">
              {remoteStream ? "Stream active" : "No stream"}
            </p>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={testMediaAccess}>
              Test Media Access
            </Button>
            <Button onClick={testWebRTCConnection} variant="outline">
              Test Direct WebRTC
            </Button>
            <Button onClick={testGroupWebRTC} variant="outline">
              Test Group WebRTC
            </Button>
            <Button onClick={endCall} variant="destructive" disabled={!isCallActive}>
              End Call
            </Button>
          </div>

          {/* Status */}
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Status</h3>
            <p>Call Active: {isCallActive ? "Yes" : "No"}</p>
            <p>Local Stream: {localStream ? "Active" : "None"}</p>
            <p>Remote Stream: {remoteStream ? "Active" : "None"}</p>
            <p>Browser Support: {navigator.mediaDevices ? "Yes" : "No"}</p>
            <p>WebRTC Support: {window.RTCPeerConnection ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
