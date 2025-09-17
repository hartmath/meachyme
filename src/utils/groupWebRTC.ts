import { supabase } from "@/integrations/supabase/client";

export type GroupCallType = 'voice' | 'video';
export type GroupCallStatus = 'calling' | 'active' | 'ended';

export interface GroupCallData {
  id: string;
  group_id: string;
  initiator_id: string;
  call_type: GroupCallType;
  status: GroupCallStatus;
  started_at?: string;
}

export interface GroupSignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-end' | 'user-joined' | 'user-left';
  callId: string;
  senderId: string;
  targetUserId?: string; // For direct peer-to-peer signaling
  data?: any;
}

export interface GroupParticipant {
  userId: string;
  userName: string;
  userAvatar?: string;
  isActive: boolean;
  joinedAt: string;
  peerConnection?: RTCPeerConnection;
  stream?: MediaStream;
}

export class GroupWebRTCManager {
  private groupId: string | null = null;
  private callId: string | null = null;
  private localStream: MediaStream | null = null;
  private participants: Map<string, GroupParticipant> = new Map();
  private signalingChannel: any = null;
  private isInitiator = false;

  private onLocalStreamCallback?: (stream: MediaStream) => void;
  private onParticipantStreamCallback?: (userId: string, stream: MediaStream) => void;
  private onParticipantJoinedCallback?: (participant: GroupParticipant) => void;
  private onParticipantLeftCallback?: (userId: string) => void;
  private onCallEndCallback?: () => void;
  private onErrorCallback?: (error: string) => void;

  constructor() {
    // Bind methods to ensure proper 'this' context
    this.initializeGroupCall = this.initializeGroupCall.bind(this);
    this.joinGroupCall = this.joinGroupCall.bind(this);
    this.endGroupCall = this.endGroupCall.bind(this);
    this.addParticipant = this.addParticipant.bind(this);
    this.removeParticipant = this.removeParticipant.bind(this);
    this.setCallbacks = this.setCallbacks.bind(this);
  }

  setCallbacks(callbacks: {
    onLocalStream?: (stream: MediaStream) => void;
    onParticipantStream?: (userId: string, stream: MediaStream) => void;
    onParticipantJoined?: (participant: GroupParticipant) => void;
    onParticipantLeft?: (userId: string) => void;
    onCallEnd?: () => void;
    onError?: (error: string) => void;
  }) {
    this.onLocalStreamCallback = callbacks.onLocalStream;
    this.onParticipantStreamCallback = callbacks.onParticipantStream;
    this.onParticipantJoinedCallback = callbacks.onParticipantJoined;
    this.onParticipantLeftCallback = callbacks.onParticipantLeft;
    this.onCallEndCallback = callbacks.onCallEnd;
    this.onErrorCallback = callbacks.onError;
  }

  async initializeGroupCall(groupId: string, callType: GroupCallType): Promise<string> {
    try {
      this.isInitiator = true;
      this.groupId = groupId;
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create group call record in database
      const { data: callData, error: callError } = await supabase
        .from('group_calls')
        .insert({
          group_id: groupId,
          initiator_id: user.id,
          call_type: callType,
          status: 'calling'
        })
        .select()
        .single();

      if (callError) throw callError;
      
      this.callId = callData.id;

      // Add initiator as participant
      await this.addParticipant(user.id, true);

      // Set up signaling channel
      await this.setupSignalingChannel();

      // Get user media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'video'
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.onLocalStreamCallback?.(this.localStream);

      // Notify other group members about the call
      await this.notifyGroupMembers();

      return this.callId;
    } catch (error: any) {
      this.onErrorCallback?.(error.message);
      throw error;
    }
  }

  async joinGroupCall(callId: string): Promise<void> {
    try {
      this.callId = callId;
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get call details
      const { data: callData, error: callError } = await supabase
        .from('group_calls')
        .select('*')
        .eq('id', callId)
        .single();

      if (callError) throw callError;
      
      this.groupId = callData.group_id;

      // Add user as participant
      await this.addParticipant(user.id, false);

      // Set up signaling channel
      await this.setupSignalingChannel();

      // Get user media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callData.call_type === 'video'
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.onLocalStreamCallback?.(this.localStream);

      // Update call status to active
      await supabase
        .from('group_calls')
        .update({ status: 'active' })
        .eq('id', callId);

      // Notify other participants
      this.sendSignalingMessage({
        type: 'user-joined',
        callId: this.callId,
        senderId: user.id,
        data: { userName: 'User' } // Will be populated with actual name
      });

    } catch (error: any) {
      this.onErrorCallback?.(error.message);
      throw error;
    }
  }

  private async setupSignalingChannel(): Promise<void> {
    if (!this.callId) return;

    // Set up real-time subscription for signaling
    this.signalingChannel = supabase
      .channel(`group-call-${this.callId}`)
      .on('broadcast', { event: 'signaling' }, (payload) => {
        this.handleSignalingMessage(payload.message);
      })
      .subscribe();
  }

  private async handleSignalingMessage(message: GroupSignalingMessage): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || message.senderId === user.id) return;

    switch (message.type) {
      case 'offer':
        await this.handleOffer(message);
        break;
      case 'answer':
        await this.handleAnswer(message);
        break;
      case 'ice-candidate':
        await this.handleIceCandidate(message);
        break;
      case 'user-joined':
        this.handleUserJoined(message);
        break;
      case 'user-left':
        this.handleUserLeft(message);
        break;
      case 'call-end':
        this.handleCallEnd();
        break;
    }
  }

  private async handleOffer(message: GroupSignalingMessage): Promise<void> {
    const participant = this.participants.get(message.senderId);
    if (!participant) return;

    const peerConnection = this.createPeerConnection(message.senderId);
    participant.peerConnection = peerConnection;

    await peerConnection.setRemoteDescription(message.data);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    this.sendSignalingMessage({
      type: 'answer',
      callId: this.callId!,
      senderId: (await supabase.auth.getUser()).data.user!.id,
      targetUserId: message.senderId,
      data: answer
    });
  }

  private async handleAnswer(message: GroupSignalingMessage): Promise<void> {
    const participant = this.participants.get(message.senderId);
    if (!participant?.peerConnection) return;

    await participant.peerConnection.setRemoteDescription(message.data);
  }

  private async handleIceCandidate(message: GroupSignalingMessage): Promise<void> {
    const participant = this.participants.get(message.senderId);
    if (!participant?.peerConnection) return;

    await participant.peerConnection.addIceCandidate(message.data);
  }

  private handleUserJoined(message: GroupSignalingMessage): void {
    // This would typically fetch user details and add to participants
    // For now, we'll just trigger the callback
    this.onParticipantJoinedCallback?.({
      userId: message.senderId,
      userName: message.data?.userName || 'Unknown User',
      isActive: true,
      joinedAt: new Date().toISOString()
    });
  }

  private handleUserLeft(message: GroupSignalingMessage): void {
    const participant = this.participants.get(message.senderId);
    if (participant?.peerConnection) {
      participant.peerConnection.close();
    }
    this.participants.delete(message.senderId);
    this.onParticipantLeftCallback?.(message.senderId);
  }

  private handleCallEnd(): void {
    this.endCall();
  }

  private createPeerConnection(targetUserId: string): RTCPeerConnection {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    };

    const peerConnection = new RTCPeerConnection(configuration);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      this.onParticipantStreamCallback?.(targetUserId, remoteStream);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        const { data: { user } } = await supabase.auth.getUser();
        this.sendSignalingMessage({
          type: 'ice-candidate',
          callId: this.callId!,
          senderId: user?.id || '',
          targetUserId,
          data: event.candidate
        });
      }
    };

    return peerConnection;
  }

  private async addParticipant(userId: string, isInitiator: boolean): Promise<void> {
    if (!this.callId) return;

    const { error } = await supabase
      .from('group_call_participants')
      .insert({
        call_id: this.callId,
        user_id: userId,
        is_active: true
      });

    if (error) throw error;

    // Add to participants map
    this.participants.set(userId, {
      userId,
      userName: 'User', // Will be updated with actual name
      isActive: true,
      joinedAt: new Date().toISOString()
    });

    // If not initiator, create peer connections for existing participants
    if (!isInitiator) {
      for (const [participantId, participant] of this.participants) {
        if (participantId !== userId) {
          const peerConnection = this.createPeerConnection(participantId);
          participant.peerConnection = peerConnection;

          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);

          this.sendSignalingMessage({
            type: 'offer',
            callId: this.callId,
            senderId: userId,
            targetUserId: participantId,
            data: offer
          });
        }
      }
    } else {
      // If initiator, create peer connection for the new participant
      const peerConnection = this.createPeerConnection(userId);
      const participant = this.participants.get(userId);
      if (participant) {
        participant.peerConnection = peerConnection;

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        this.sendSignalingMessage({
          type: 'offer',
          callId: this.callId,
          senderId: (await supabase.auth.getUser()).data.user!.id,
          targetUserId: userId,
          data: offer
        });
      }
    }
  }

  private async notifyGroupMembers(): Promise<void> {
    if (!this.groupId) return;

    // Get all group members
    const { data: members } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', this.groupId);

    // Send notification to each member (this would typically be a push notification)
    // For now, we'll just log it
    console.log('Notifying group members about call:', members);
  }

  private sendSignalingMessage(message: GroupSignalingMessage): void {
    if (this.signalingChannel) {
      this.signalingChannel.send({
        type: 'broadcast',
        event: 'signaling',
        payload: { message }
      });
    }
  }

  async endCall(): Promise<void> {
    try {
      if (this.callId) {
        // Update call status
        await supabase
          .from('group_calls')
          .update({ 
            status: 'ended',
            ended_at: new Date().toISOString()
          })
          .eq('id', this.callId);

        // Mark user as left
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('group_call_participants')
            .update({ 
              is_active: false,
              left_at: new Date().toISOString()
            })
            .eq('call_id', this.callId)
            .eq('user_id', user.id);
        }

        // Notify other participants
        this.sendSignalingMessage({
          type: 'call-end',
          callId: this.callId,
          senderId: user?.id || '',
          data: {}
        });
      }

      // Clean up
      this.cleanup();
      this.onCallEndCallback?.();
    } catch (error: any) {
      this.onErrorCallback?.(error.message);
    }
  }

  private cleanup(): void {
    // Close all peer connections
    this.participants.forEach(participant => {
      if (participant.peerConnection) {
        participant.peerConnection.close();
      }
    });

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Unsubscribe from signaling channel
    if (this.signalingChannel) {
      supabase.removeChannel(this.signalingChannel);
      this.signalingChannel = null;
    }

    // Clear participants
    this.participants.clear();
    this.callId = null;
    this.groupId = null;
  }

  toggleAudio(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  getParticipants(): GroupParticipant[] {
    return Array.from(this.participants.values());
  }
}
