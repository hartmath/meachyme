import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, MoreVertical, Users, Phone, Video, Image, Paperclip, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loading } from "@/components/Loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { sendGroupMessageNotification } from "@/utils/pushNotifications";
import { MessageReactions } from "@/components/MessageReactions";
import { VoiceMessagePlayer } from "@/components/VoiceMessagePlayer";
import { VoiceMessageRecorder } from "@/components/VoiceMessageRecorder";
import { useAuth } from "@/contexts/AuthContext";

export default function GroupChatDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, { full_name: string; avatar_url: string }>>({});

  // Fetch group details
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: async () => {
      if (!id) return null;

      const { data: groupData, error } = await supabase
        .from('new_groups')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return groupData;
    },
    enabled: !!id
  });

  // Fetch current user id
  useEffect(() => {
    setCurrentUserId(authUser?.id || null);
  }, [authUser?.id]);

  // Fetch user profiles for messages
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const fetchUserProfiles = async () => {
      const senderIds = [...new Set(messages.map(m => m.sender_id))];
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', senderIds);

      if (error) {
        console.error('Error fetching user profiles:', error);
        return;
      }

      const profileMap: Record<string, { full_name: string; avatar_url: string }> = {};
      profiles?.forEach(profile => {
        profileMap[profile.id] = {
          full_name: profile.full_name || 'Unknown User',
          avatar_url: profile.avatar_url || ''
        };
      });

      setUserProfiles(profileMap);
    };

    fetchUserProfiles();
  }, [messages]);

  // Fetch group members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['group-members', id],
    queryFn: async () => {
      if (!id) return [];

      const { data: membersData, error } = await supabase
        .from('new_group_members')
        .select(`
          role,
          joined_at,
            user_id,
          profiles!inner (
            id,
            full_name,
            avatar_url,
            is_online
          )
        `)
        .eq('group_id', id);

      if (error) throw error;
      return membersData;
    },
    enabled: !!id
  });

  // Fetch group messages
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['group-messages', id],
    queryFn: async () => {
      if (!id) return [];

      const { data: messagesData, error } = await supabase
        .from('new_group_messages')
        .select(`
          id,
          content,
          message_type,
          attachment_url,
          attachment_metadata,
          created_at,
          sender_id
        `)
        .eq('group_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
      console.log('Fetched messages:', messagesData);
      return messagesData;
    },
    enabled: !!id
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, attachmentUrl, messageType = 'text', attachmentMetadata }: { content: string; attachmentUrl?: string; messageType?: 'text' | 'image' | 'file' | 'voice'; attachmentMetadata?: Record<string, unknown> }) => {
      const user = authUser;
      if (!user || !id) throw new Error('Not authenticated or no group ID');

      console.log('Sending group message:', { group_id: id, sender_id: user.id, content: content.trim() });

      const { data, error } = await supabase
        .from('new_group_messages')
        .insert({
          group_id: id,
          sender_id: user.id,
          content: content.trim(),
          message_type: messageType,
          attachment_url: attachmentUrl,
          attachment_metadata: attachmentMetadata
        })
        .select();

      console.log('Group message result:', { data, error });

      if (error) throw error;
      return data;

      // Send push notifications to all group members except sender
      if (members && group) {
        const senderName = user.user_metadata?.full_name || user.email || 'Someone';
        const groupName = group.name;
        
        for (const member of members) {
          if (member.user_id !== user.id) {
            try {
              await sendGroupMessageNotification(
                member.user_id,
                senderName,
                groupName,
                content.trim(),
                id
              );
            } catch (notificationError) {
              console.error('Failed to send group push notification:', notificationError);
            }
          }
        }
      }
    },
    onSuccess: () => {
      setNewMessage("");
      // Don't invalidate here - real-time subscription will handle updates
    },
    onError: (error) => {
      console.error('Group message error:', error);
      toast({
        title: "Failed to send message",
        description: error.message || 'An unexpected error occurred',
        variant: "destructive"
      });
    }
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const user = authUser;
      if (!user || !id) throw new Error('Not authenticated or no group ID');

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/group-${id}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      return { publicUrl, fileName, fileType: file.type };
    },
    onSuccess: async (fileData) => {
      const user = authUser;
      if (!user || !id) return;

      const messageType = fileData.fileType.startsWith('image/') ? 'image' : 'file';
      const content = messageType === 'image' ? '📷 Image' : `📎 ${fileData.fileName}`;

      const { error } = await supabase
        .from('new_group_messages')
        .insert({
          group_id: id,
          sender_id: user.id,
          content,
          message_type: messageType,
          attachment_url: fileData.publicUrl
        });

      if (error) {
        toast({
          title: "Failed to send file",
          description: error.message,
          variant: "destructive"
        });
      }
      // Real-time subscription will handle updates
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Set up real-time subscription for group messages
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel('new_group_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'new_group_messages',
          filter: `group_id=eq.${id}`
        },
        () => {
          // Invalidate messages query to refetch
          queryClient.invalidateQueries({ queryKey: ['group-messages', id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark group messages as read when chat is opened
  useEffect(() => {
    if (!id || !messages) return;

    const markGroupMessagesAsRead = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Mark all unread group messages as read
        const { error } = await supabase
          .from('new_group_messages')
          .update({ is_read: true })
          .eq('group_id', id)
          .neq('sender_id', user.id)
          .eq('is_read', false);

        if (error) throw error;

        // Invalidate badge counts to update immediately
        console.log('🔄 Invalidating badge queries after marking group messages as read');
        queryClient.invalidateQueries({ queryKey: ['unread-message-counts'] });
        queryClient.invalidateQueries({ queryKey: ['user-groups'] });
        
        // Force refetch badge counts immediately
        queryClient.refetchQueries({ queryKey: ['unread-message-counts'] });
      } catch (error) {
        console.error('Error marking group messages as read:', error);
      }
    };

    markGroupMessagesAsRead();
  }, [id, messages, queryClient]);

  const handleSendMessage = () => {
    if (newMessage.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate({ content: newMessage });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) { // 20MB limit
        toast({
          title: "File too large",
          description: "Please select a file smaller than 20MB.",
          variant: "destructive"
        });
        return;
      }

      uploadFileMutation.mutate(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleVoiceMessageSend = async (audioBlob: Blob, duration: number) => {
    try {
      const user = authUser;
      if (!user || !id) throw new Error('Not authenticated or missing group ID');

      // Upload voice message to Supabase Storage
      const fileExt = 'wav';
      const fileName = `${user.id}/${id}/voice-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      // Send message with voice attachment and duration
      sendMessageMutation.mutate({ 
        content: "Voice message", 
        attachmentUrl: publicUrl,
        messageType: 'voice',
        attachmentMetadata: { duration: duration }
      });

      setShowVoiceRecorder(false);
    } catch (error) {
      console.error('Error sending voice message:', error);
      toast({
        title: "Failed to send voice message",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  // Start group call mutation
  const startGroupCallMutation = useMutation({
    mutationFn: async (callType: 'voice' | 'video') => {
      const user = authUser;
      if (!user || !id) throw new Error('Not authenticated or no group ID');

      // Create group call record
      const { data: callData, error } = await supabase
        .from('group_calls')
        .insert({
          group_id: id,
          initiator_id: user.id,
          call_type: callType,
          status: 'calling'
        })
        .select()
        .single();

      if (error) throw error;

      // Add initiator as participant
      await supabase
        .from('group_call_participants')
        .insert({
          call_id: callData.id,
          user_id: user.id,
          is_active: true
        });

      return callData;
    },
    onSuccess: (callData) => {
      // Show success message and navigate to MEA Meet for now
      toast({
        title: "Group call started",
        description: `Starting ${callData.call_type} call for ${group?.name}`,
      });
      // Navigate to MEA Meet page (coming soon)
      navigate(`/meet/${callData.id}`);
    },
    onError: (error) => {
      toast({
        title: "Failed to start call",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleStartVoiceCall = () => {
    startGroupCallMutation.mutate('voice');
  };

  const handleStartVideoCall = () => {
    startGroupCallMutation.mutate('video');
  };


  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  if (groupLoading || membersLoading || messagesLoading) {
    return <Loading className="p-8" text="Loading group chat..." />;
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Group not found</h2>
          <Button onClick={() => navigate("/groups")}>
            Back to Groups
          </Button>
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b border-border bg-card">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/groups")}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <Avatar className="h-8 w-8">
            <AvatarImage src={group.avatar_url} alt={group.name} />
            <AvatarFallback>{getInitials(group.name)}</AvatarFallback>
          </Avatar>
          
          <div>
            <h1 className="font-semibold text-sm">{group.name}</h1>
            <p className="text-xs text-muted-foreground">
              {members?.length || 0} members
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8"
            onClick={handleStartVoiceCall}
            disabled={startGroupCallMutation.isPending}
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8"
            onClick={handleStartVideoCall}
            disabled={startGroupCallMutation.isPending}
          >
            <Video className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/group/${id}/settings`)}>
                <Users className="h-4 w-4 mr-2" />
                Group Info
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages?.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-foreground mb-2">No messages yet</h3>
            <p className="text-sm text-muted-foreground">
              Start the conversation in {group.name}
            </p>
          </div>
        ) : (
          messages?.map((message) => {
            const isOwn = message.sender_id === currentUserId;
            if (isOwn) {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[75%] rounded-2xl px-3 py-2 bg-primary text-primary-foreground">
                    {message.message_type === 'image' && message.attachment_url ? (
                      <div>
                        <img 
                          src={message.attachment_url} 
                          alt="Shared image" 
                          className="rounded-lg max-w-full h-auto"
                        />
                        {message.content !== '📷 Image' && (
                          <p className="text-sm mt-1">{message.content}</p>
                        )}
                      </div>
                    ) : message.message_type === 'file' && message.attachment_url ? (
                      <div>
                        <p className="text-sm">{message.content}</p>
                        <a 
                          href={message.attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs underline"
                        >
                          Download file
                        </a>
                      </div>
                    ) : message.message_type === 'voice' && message.attachment_url ? (
                      <VoiceMessagePlayer 
                        audioUrl={message.attachment_url}
                        duration={message.attachment_metadata?.duration} />
                    ) : (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    )}
                    <div className="flex justify-end mt-1">
                      <span className="text-[10px] opacity-80">{formatTime(message.created_at)}</span>
                    </div>
                    <MessageReactions 
                      messageId={message.id} 
                      messageType="group" 
                    />
                  </div>
                </div>
              );
            }
            // Other user's message
            return (
              <div key={message.id} className="flex items-start gap-2">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={userProfiles[message.sender_id]?.avatar_url} alt={userProfiles[message.sender_id]?.full_name} />
                  <AvatarFallback>{getInitials(userProfiles[message.sender_id]?.full_name || 'U')}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-foreground">
                      {userProfiles[message.sender_id]?.full_name || 'Unknown User'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                  <div className="max-w-[75%] rounded-2xl px-3 py-2 bg-muted text-foreground">
                    {message.message_type === 'image' && message.attachment_url ? (
                      <div>
                        <img 
                          src={message.attachment_url} 
                          alt="Shared image" 
                          className="rounded-lg max-w-full h-auto"
                        />
                        <p className="text-sm mt-1">{message.content}</p>
                      </div>
                    ) : message.message_type === 'file' && message.attachment_url ? (
                      <div>
                        <p className="text-sm">{message.content}</p>
                        <a 
                          href={message.attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Download file
                        </a>
                      </div>
                    ) : message.message_type === 'voice' && message.attachment_url ? (
                      <VoiceMessagePlayer 
                        audioUrl={message.attachment_url}
                        duration={message.attachment_metadata?.duration} />
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                    <MessageReactions 
                      messageId={message.id} 
                      messageType="group" 
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Message Recorder */}
      {showVoiceRecorder && (
        <div className="p-3 border-t border-border bg-card">
          <VoiceMessageRecorder
            onSend={handleVoiceMessageSend}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        </div>
      )}

      {/* Message Input */}
      <div className="p-3 border-t border-border bg-card">
        <div className="flex items-center space-x-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={triggerFileUpload}
            className="h-8 w-8 flex-shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowVoiceRecorder(true)}
            className="h-8 w-8 flex-shrink-0"
          >
            <Mic className="h-4 w-4" />
          </Button>
          
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 h-8 text-sm"
            disabled={sendMessageMutation.isPending}
          />
          
          <Button
            onClick={handleSendMessage}
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,application/pdf,.doc,.docx,.txt"
        />
      </div>
    </div>
  );
}
