import { supabase } from "@/integrations/supabase/client";

export type CallType = 'voice' | 'video';
export type CallStatus = 'calling' | 'answered' | 'declined' | 'missed' | 'ended';

export interface CallData {
  id: string;
  caller_id: string;
  callee_id: string;
  call_type: CallType;
  status: CallStatus;
  started_at?: string;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-end' | 'call-decline';
  callId: string;
  senderId: string;
  data?: any;
}

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private signalingChannel: any = null;
  private callId: string | null = null;
  private isInitiator = false;

  private onLocalStreamCallback?: (stream: MediaStream) => void;
  private onRemoteStreamCallback?: (stream: MediaStream) => void;
  private onCallEndCallback?: () => void;
  private onErrorCallback?: (error: string) => void;

  constructor() {
    this.setupPeerConnection();
    
    // Bind methods to ensure proper 'this' context
    this.initializeCall = this.initializeCall.bind(this);
    this.answerCall = this.answerCall.bind(this);
    this.endCall = this.endCall.bind(this);
    this.setCallbacks = this.setCallbacks.bind(this);
    this.setupPeerConnection = this.setupPeerConnection.bind(this);
  }

  private setupPeerConnection() {
    // STUN servers for NAT traversal
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    // Handle ICE candidates
    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate && this.callId) {
        const { data: { user } } = await supabase.auth.getUser();
        this.sendSignalingMessage({
          type: 'ice-candidate',
          callId: this.callId,
          senderId: user?.id || '',
          data: event.candidate
        });
      }
    };

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.onRemoteStreamCallback?.(this.remoteStream);
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'failed' || 
          this.peerConnection?.connectionState === 'disconnected') {
        this.endCall();
      }
    };
  }

  setCallbacks(callbacks: {
    onLocalStream?: (stream: MediaStream) => void;
    onRemoteStream?: (stream: MediaStream) => void;
    onCallEnd?: () => void;
    onError?: (error: string) => void;
  }) {
    this.onLocalStreamCallback = callbacks.onLocalStream;
    this.onRemoteStreamCallback = callbacks.onRemoteStream;
    this.onCallEndCallback = callbacks.onCallEnd;
    this.onErrorCallback = callbacks.onError;
  }

  // Public method to create peer connection if needed
  createPeerConnection(): void {
    if (!this.peerConnection) {
      this.setupPeerConnection();
    }
  }

  async initializeCall(recipientId: string, callType: CallType): Promise<string> {
    try {
      this.isInitiator = true;
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create call record in database
      const { data: callData, error: callError } = await supabase
        .from('calls')
        .insert({
          caller_id: user.id,
          callee_id: recipientId,
          call_type: callType,
          status: 'calling'
        })
        .select()
        .single();

      if (callError) throw callError;
      
      this.callId = callData.id;

      // Ensure peer connection is set up
      this.createPeerConnection();

      // Set up signaling channel
      await this.setupSignalingChannel();

      // Get user media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'video'
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.onLocalStreamCallback?.(this.localStream);

      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Create and send offer
      const offer = await this.peerConnection!.createOffer();
      await this.peerConnection!.setLocalDescription(offer);

      this.sendSignalingMessage({
        type: 'offer',
        callId: this.callId,
        senderId: user.id,
        data: offer
      });

      return this.callId;
    } catch (error: any) {
      this.onErrorCallback?.(error.message);
      throw error;
    }
  }

  async answerCall(callId: string): Promise<void> {
    try {
      this.callId = callId;
      this.isInitiator = false;

      // Ensure peer connection is set up
      this.createPeerConnection();

      // Update call status in database
      await supabase
        .from('calls')
        .update({ status: 'answered' })
        .eq('id', callId);

      // Set up signaling channel
      await this.setupSignalingChannel();

      // Get call info to determine if it's video or audio
      const { data: callInfo } = await supabase
        .from('calls')
        .select('call_type')
        .eq('id', callId)
        .single();

      // Get user media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callInfo?.call_type === 'video'
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.onLocalStreamCallback?.(this.localStream);

      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

    } catch (error: any) {
      this.onErrorCallback?.(error.message);
      throw error;
    }
  }

  async declineCall(callId: string): Promise<void> {
    try {
      // Update call status in database
      await supabase
        .from('calls')
        .update({ 
          status: 'declined',
          ended_at: new Date().toISOString()
        })
        .eq('id', callId);

      // Send decline signal
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.sendSignalingMessage({
          type: 'call-decline',
          callId: callId,
          senderId: user.id
        });
      }

      this.cleanup();
    } catch (error: any) {
      this.onErrorCallback?.(error.message);
    }
  }

  async endCall(): Promise<void> {
    try {
      if (this.callId) {
        // Calculate duration
        const { data: callData } = await supabase
          .from('calls')
          .select('started_at')
          .eq('id', this.callId)
          .single();

        const duration = callData?.started_at 
          ? Math.floor((new Date().getTime() - new Date(callData.started_at).getTime()) / 1000)
          : 0;

        // Update call status in database
        await supabase
          .from('calls')
          .update({ 
            status: 'ended',
            ended_at: new Date().toISOString(),
            duration_seconds: duration
          })
          .eq('id', this.callId);

        // Send end signal
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          this.sendSignalingMessage({
            type: 'call-end',
            callId: this.callId,
            senderId: user.id
          });
        }
      }

      this.cleanup();
      this.onCallEndCallback?.();
    } catch (error: any) {
      this.onErrorCallback?.(error.message);
    }
  }

  private async setupSignalingChannel() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !this.callId) return;

    // Create a unique channel for this call
    this.signalingChannel = supabase.channel(`call-${this.callId}`)
      .on('broadcast', { event: 'signaling' }, (payload) => {
        this.handleSignalingMessage(payload.payload as SignalingMessage);
      })
      .subscribe();
  }

  private async handleSignalingMessage(message: SignalingMessage) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || message.senderId === user.id) return; // Ignore own messages

      switch (message.type) {
        case 'offer':
          if (!this.isInitiator) {
            await this.peerConnection!.setRemoteDescription(message.data);
            const answer = await this.peerConnection!.createAnswer();
            await this.peerConnection!.setLocalDescription(answer);
            
            this.sendSignalingMessage({
              type: 'answer',
              callId: this.callId!,
              senderId: user.id,
              data: answer
            });
          }
          break;

        case 'answer':
          if (this.isInitiator) {
            await this.peerConnection!.setRemoteDescription(message.data);
            
            // Mark call as answered and update started_at
            await supabase
              .from('calls')
              .update({ 
                status: 'answered',
                started_at: new Date().toISOString()
              })
              .eq('id', this.callId!);
          }
          break;

        case 'ice-candidate':
          await this.peerConnection!.addIceCandidate(message.data);
          break;

        case 'call-decline':
        case 'call-end':
          this.cleanup();
          this.onCallEndCallback?.();
          break;
      }
    } catch (error: any) {
      console.error('Error handling signaling message:', error);
      this.onErrorCallback?.(error.message);
    }
  }

  private sendSignalingMessage(message: SignalingMessage) {
    if (this.signalingChannel) {
      this.signalingChannel.send({
        type: 'broadcast',
        event: 'signaling',
        payload: message
      });
    }
  }

  private cleanup() {
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Clear remote stream
    this.remoteStream = null;

    // Clean up signaling channel
    if (this.signalingChannel) {
      supabase.removeChannel(this.signalingChannel);
      this.signalingChannel = null;
    }

    // Reset call state
    this.callId = null;
    this.isInitiator = false;
  }

  // Utility methods
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

  getLocalStream() {
    return this.localStream;
  }

  getRemoteStream() {
    return this.remoteStream;
  }
}