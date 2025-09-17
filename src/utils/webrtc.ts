// WebRTC utilities for MEA Meet
export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave';
  data?: any;
  from?: string;
  to?: string;
  meetingId?: string;
}

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private signalingChannel: BroadcastChannel | null = null;
  private meetingId: string;
  private userId: string;

  constructor(meetingId: string, userId: string) {
    this.meetingId = meetingId;
    this.userId = userId;
    this.initializeSignaling();
  }

  private initializeSignaling() {
    // Use BroadcastChannel for local signaling (in a real app, use WebSocket)
    this.signalingChannel = new BroadcastChannel(`mea-meet-${this.meetingId}`);
    
    this.signalingChannel.onmessage = (event) => {
      const message: SignalingMessage = event.data;
      this.handleSignalingMessage(message);
    };
  }

  private handleSignalingMessage(message: SignalingMessage) {
    if (message.from === this.userId) return; // Ignore own messages

    switch (message.type) {
      case 'offer':
        this.handleOffer(message.data);
        break;
      case 'answer':
        this.handleAnswer(message.data);
        break;
      case 'ice-candidate':
        this.handleIceCandidate(message.data);
        break;
      case 'join':
        this.handleUserJoin(message.from!);
        break;
      case 'leave':
        this.handleUserLeave(message.from!);
        break;
    }
  }

  private async handleOffer(offer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return;

    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.sendSignalingMessage({
      type: 'answer',
      data: answer,
      to: 'all'
    });
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(answer);
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) return;
    await this.peerConnection.addIceCandidate(candidate);
  }

  private handleUserJoin(userId: string) {
    console.log(`User ${userId} joined the meeting`);
  }

  private handleUserLeave(userId: string) {
    console.log(`User ${userId} left the meeting`);
  }

  private sendSignalingMessage(message: SignalingMessage) {
    if (!this.signalingChannel) return;

    this.signalingChannel.postMessage({
      ...message,
      from: this.userId,
      meetingId: this.meetingId
    });
  }

  async initializePeerConnection() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          data: event.candidate,
          to: 'all'
        });
      }
    };

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
      if (remoteVideo && event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
      }
    };

    return this.peerConnection;
  }

  async startLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // Add tracks to peer connection
      if (this.peerConnection) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection!.addTrack(track, this.localStream!);
        });
      }

      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  async createOffer() {
    if (!this.peerConnection) return;

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.sendSignalingMessage({
      type: 'offer',
      data: offer,
      to: 'all'
    });

    return offer;
  }

  async joinMeeting() {
    this.sendSignalingMessage({
      type: 'join',
      to: 'all'
    });
  }

  async leaveMeeting() {
    this.sendSignalingMessage({
      type: 'leave',
      to: 'all'
    });

    this.cleanup();
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  async toggleScreenShare() {
    if (!this.localStream) return false;

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      const videoTrack = screenStream.getVideoTracks()[0];
      const sender = this.peerConnection?.getSenders().find(
        s => s.track?.kind === 'video'
      );

      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }

      // Handle screen share end
      videoTrack.onended = () => {
        const cameraTrack = this.localStream?.getVideoTracks()[0];
        if (cameraTrack && sender) {
          sender.replaceTrack(cameraTrack);
        }
      };

      return true;
    } catch (error) {
      console.error('Error sharing screen:', error);
      return false;
    }
  }

  private cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.signalingChannel) {
      this.signalingChannel.close();
      this.signalingChannel = null;
    }
  }
}

// Utility functions
export const generateMeetingId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const generateUserId = (): string => {
  return 'user_' + Math.random().toString(36).substring(2, 15);
};

export const formatMeetingTime = (date: Date): string => {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `In ${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `In ${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `In ${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return 'Starting now';
  }
};
