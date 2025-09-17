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
    // STUN and TURN servers for NAT traversal
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        // Add more STUN servers for better connectivity
        { urls: 'stun:stun.ekiga.net' },
        { urls: 'stun:stun.ideasip.com' },
        { urls: 'stun:stun.schlund.de' },
        { urls: 'stun:stun.stunprotocol.org:3478' },
        { urls: 'stun:stun.voiparound.com' },
        { urls: 'stun:stun.voipbuster.com' },
        { urls: 'stun:stun.voipstunt.com' },
        { urls: 'stun:stun.counterpath.com' },
        { urls: 'stun:stun.1und1.de' },
        { urls: 'stun:stun.gmx.net' },
        { urls: 'stun:stun.sipgate.net' },
        { urls: 'stun:stun.radiojar.com' },
        { urls: 'stun:stun.sonetel.com' },
        { urls: 'stun:stun.voipgate.com' },
        { urls: 'stun:stun.voys.nl' }
      ],
      iceCandidatePoolSize: 10
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
      const state = this.peerConnection?.connectionState;
      console.log('Connection state:', state);
      
      switch (state) {
        case 'connected':
          console.log('WebRTC connection established successfully');
          break;
        case 'connecting':
          console.log('WebRTC connection in progress...');
          break;
        case 'disconnected':
          console.log('WebRTC connection disconnected');
          this.onErrorCallback?.('Connection lost. Attempting to reconnect...');
          break;
        case 'failed':
          console.log('WebRTC connection failed');
          this.onErrorCallback?.('Connection failed. Please check your network and try again.');
          this.endCall();
          break;
        case 'closed':
          console.log('WebRTC connection closed');
          break;
      }
    };

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection?.iceConnectionState;
      console.log('ICE connection state:', iceState);
      
      if (iceState === 'failed') {
        console.log('ICE connection failed');
        this.onErrorCallback?.('Network connection failed. Please check your internet connection.');
      }
    };

    // Handle ICE gathering state changes
    this.peerConnection.onicegatheringstatechange = () => {
      const gatheringState = this.peerConnection?.iceGatheringState;
      console.log('ICE gathering state:', gatheringState);
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

      // Check if we're on HTTPS (required for WebRTC)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error('WebRTC requires HTTPS. Please use a secure connection.');
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support WebRTC. Please use a modern browser.');
      }

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

      if (callError) {
        console.error('Database error:', callError);
        throw new Error('Failed to create call record');
      }

      // Send push notification to recipient
      try {
        await fetch('/api/send-call-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipientId,
            senderName: user.user_metadata?.full_name || user.email || 'Someone',
            callType,
            callId: callData.id
          })
        });
      } catch (notificationError) {
        console.error('Failed to send call notification:', notificationError);
        // Don't throw error - call should still work without notification
      }
      
      this.callId = callData.id;

      // Ensure peer connection is set up
      this.createPeerConnection();

      // Set up signaling channel
      await this.setupSignalingChannel();

      // Get user media with better error handling
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      };

      try {
        console.log('Requesting user media with constraints:', constraints);
        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Got local stream:', this.localStream);
        
        // Call the callback immediately when we get the local stream
        this.onLocalStreamCallback?.(this.localStream);

        // Add tracks to peer connection
        this.localStream.getTracks().forEach(track => {
          if (this.peerConnection && this.localStream) {
            this.peerConnection.addTrack(track, this.localStream);
          }
        });
        
        console.log('Added tracks to peer connection');
      } catch (mediaError: any) {
        console.error('Media access error:', mediaError);
        if (mediaError.name === 'NotAllowedError') {
          throw new Error('Camera/microphone access denied. Please allow access and try again.');
        } else if (mediaError.name === 'NotFoundError') {
          throw new Error('No camera/microphone found. Please check your device.');
        } else if (mediaError.name === 'NotReadableError') {
          throw new Error('Camera/microphone is being used by another application.');
        } else {
          throw new Error('Failed to access camera/microphone: ' + mediaError.message);
        }
      }

      // Create and send offer
      console.log('Creating offer...');
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video'
      });
      await this.peerConnection!.setLocalDescription(offer);
      console.log('Offer created and set as local description');

      this.sendSignalingMessage({
        type: 'offer',
        callId: this.callId,
        senderId: user.id,
        data: offer
      });

      return this.callId;
    } catch (error: any) {
      console.error('Initialize call error:', error);
      this.onErrorCallback?.(error.message);
      throw error;
    }
  }

  async answerCall(callId: string): Promise<void> {
    try {
      this.callId = callId;
      this.isInitiator = false;

      // Check if we're on HTTPS (required for WebRTC)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error('WebRTC requires HTTPS. Please use a secure connection.');
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support WebRTC. Please use a modern browser.');
      }

      // Ensure peer connection is set up
      this.createPeerConnection();

      // Set up signaling channel FIRST to receive offers
      await this.setupSignalingChannel();

      // Get call info to determine if it's video or audio
      const { data: callInfo, error: callInfoError } = await supabase
        .from('calls')
        .select('call_type')
        .eq('id', callId)
        .single();

      if (callInfoError) {
        console.error('Failed to get call info:', callInfoError);
        throw new Error('Failed to get call information');
      }

      // Get user media with better error handling
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: callInfo?.call_type === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      };

      try {
        console.log('Answering call - requesting user media with constraints:', constraints);
        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Answer call - got local stream:', this.localStream);
        
        // Call the callback immediately when we get the local stream
        this.onLocalStreamCallback?.(this.localStream);

        // Add tracks to peer connection
        this.localStream.getTracks().forEach(track => {
          if (this.peerConnection && this.localStream) {
            this.peerConnection.addTrack(track, this.localStream);
          }
        });
        
        console.log('Answer call - added tracks to peer connection');

        // Update call status in database AFTER setting up media
        const { error: updateError } = await supabase
          .from('calls')
          .update({ status: 'answered' })
          .eq('id', callId);

        if (updateError) {
          console.error('Failed to update call status:', updateError);
          throw new Error('Failed to answer call');
        }

      } catch (mediaError: any) {
        console.error('Answer call - media access error:', mediaError);
        if (mediaError.name === 'NotAllowedError') {
          throw new Error('Camera/microphone access denied. Please allow access and try again.');
        } else if (mediaError.name === 'NotFoundError') {
          throw new Error('No camera/microphone found. Please check your device.');
        } else if (mediaError.name === 'NotReadableError') {
          throw new Error('Camera/microphone is being used by another application.');
        } else {
          throw new Error('Failed to access camera/microphone: ' + mediaError.message);
        }
      }

    } catch (error: any) {
      console.error('Answer call error:', error);
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

      console.log('Received signaling message:', message.type, 'from:', message.senderId);

      switch (message.type) {
        case 'offer':
          if (!this.isInitiator && this.peerConnection) {
            console.log('Processing offer from caller...');
            await this.peerConnection.setRemoteDescription(message.data);
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            console.log('Sending answer back to caller...');
            this.sendSignalingMessage({
              type: 'answer',
              callId: this.callId!,
              senderId: user.id,
              data: answer
            });
          }
          break;

        case 'answer':
          if (this.isInitiator && this.peerConnection) {
            console.log('Processing answer from callee...');
            await this.peerConnection.setRemoteDescription(message.data);
            
            // Mark call as answered and update started_at
            await supabase
              .from('calls')
              .update({ 
                status: 'answered',
                started_at: new Date().toISOString()
              })
              .eq('id', this.callId!);
            
            console.log('Call connection established!');
          }
          break;

        case 'ice-candidate':
          if (this.peerConnection && message.data) {
            console.log('Adding ICE candidate...');
            await this.peerConnection.addIceCandidate(message.data);
          }
          break;

        case 'call-decline':
          console.log('Call declined by remote party');
          this.cleanup();
          this.onCallEndCallback?.();
          break;

        case 'call-end':
          console.log('Call ended by remote party');
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
      console.log('Sending signaling message:', message.type, 'to call:', message.callId);
      this.signalingChannel.send({
        type: 'broadcast',
        event: 'signaling',
        payload: message
      });
    } else {
      console.error('No signaling channel available to send message:', message.type);
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