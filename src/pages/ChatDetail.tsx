import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Send, Smile, Image, FileText, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaViewer } from "@/components/MediaViewer";
import { ChatHeader } from "@/components/ChatHeader";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loading, FullScreenLoading } from "@/components/Loading";
import { sendMessageNotification } from "@/utils/pushNotifications";
import { MessageReactions } from "@/components/MessageReactions";
import { VoiceMessageRecorder } from "@/components/VoiceMessageRecorder";
import { VoiceMessagePlayer } from "@/components/VoiceMessagePlayer";

export default function ChatDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messagesEndRef, setMessagesEndRef] = useState<HTMLDivElement | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [mediaViewer, setMediaViewer] = useState<{
    isOpen: boolean;
    url: string;
    type: "image" | "video";
    title?: string;
  }>({
    isOpen: false,
    url: "",
    type: "image"
  });

  // Get current user ID
  useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      return user;
    }
  });

  // Set up real-time message subscription
  useEffect(() => {
    if (!currentUserId || !id) return;

    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `or(and(sender_id.eq.${currentUserId},recipient_id.eq.${id}),and(sender_id.eq.${id},recipient_id.eq.${currentUserId}))`
        },
        () => {
          // Invalidate messages query to refetch
          queryClient.invalidateQueries({ queryKey: ['chat-messages', id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, id, queryClient]);

  // Set up user presence tracking
  useEffect(() => {
    if (!currentUserId) return;

    const presenceChannel = supabase.channel('user_presence')
      .on('presence', { event: 'sync' }, () => {
        // Update online status when presence changes
        queryClient.invalidateQueries({ queryKey: ['chat-partner', id] });
      })
      .on('presence', { event: 'join' }, () => {
        queryClient.invalidateQueries({ queryKey: ['chat-partner', id] });
      })
      .on('presence', { event: 'leave' }, () => {
        queryClient.invalidateQueries({ queryKey: ['chat-partner', id] });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track current user presence
          await presenceChannel.track({
            user_id: currentUserId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [currentUserId, queryClient, id]);

  // Fetch chat partner's profile
  const { data: chatPartner, isLoading: loadingPartner } = useQuery({
    queryKey: ['chat-partner', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', id)
        .maybeSingle();

      if (error) throw error;
      return profile;
    },
    enabled: !!id
  });

  // Fetch messages between current user and chat partner
  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ['chat-messages', id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) return [];

      const { data: messages, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${id}),and(sender_id.eq.${id},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return messages;
    },
    enabled: !!id
    // Removed refetchInterval since we now have real-time updates
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef) {
      messagesEndRef.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, messagesEndRef]);

  // Mutation to upload chat attachment
  const uploadAttachmentMutation = useMutation({
    mutationFn: async ({ file, recipientId }: { file: File; recipientId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Create filename with both user IDs for shared access
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${recipientId}/${Date.now()}-${file.name}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL for private bucket requires signed URL
      const { data: signedUrl, error: urlError } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(fileName, 60 * 60 * 24); // 24 hour access

      if (urlError) throw urlError;

      return {
        url: signedUrl.signedUrl,
        fileName: file.name,
        fileType: file.type
      };
    },
    onSuccess: ({ url, fileName, fileType }) => {
      // Send message with attachment
      const messageType = fileType.startsWith('image/') ? 'image' : 'file';
      const content = messageType === 'image' ? 'Image' : fileName;
      
      sendMessageMutation.mutate({ 
        content, 
        attachmentUrl: url, 
        messageType 
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation to send a new message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, attachmentUrl, messageType = 'text' }: { content: string; attachmentUrl?: string; messageType?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) throw new Error('Missing user or recipient');

      const { error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          recipient_id: id,
          content: content,
          message_type: messageType,
          attachment_url: attachmentUrl
        });

      if (error) throw error;

      // Send push notification to recipient
      if (messageType === 'text' && content.trim()) {
        try {
          await sendMessageNotification(
            id,
            user.user_metadata?.full_name || user.email || 'Someone',
            content,
            id
          );
        } catch (notificationError) {
          console.error('Failed to send push notification:', notificationError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setNewMessage("");
      setReplyingTo(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendMessageMutation.mutate({ content: newMessage.trim() });
    }
  };

  const handleFileUpload = (type: "image" | "document" | "voice") => {
    if (type === "voice") {
      setShowVoiceRecorder(true);
      return;
    }
    
    if (type === "image") {
      fileInputRef.current?.click();
    } else if (type === "document") {
      documentInputRef.current?.click();
    }
  };

  const handleVoiceMessageSend = async (audioBlob: Blob) => {
    try {
      // Upload voice message to Supabase Storage
      const fileExt = 'wav';
      const fileName = `voice-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(fileName);

      // Send message with voice attachment
      sendMessageMutation.mutate({ 
        content: "Voice message", 
        attachmentUrl: publicUrl,
        messageType: 'voice'
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && id) {
      if (file.size > 20 * 1024 * 1024) { // 20MB limit
        toast({
          title: "File too large",
          description: "Please select a file smaller than 20MB.",
          variant: "destructive"
        });
        return;
      }

      uploadAttachmentMutation.mutate({ file, recipientId: id });
    }
    
    // Reset input
    event.target.value = '';
  };

  const handleReactToMessage = (messageId: string, emoji: string) => {
    console.log("Reacting to message:", messageId, "with", emoji);
    // Reaction logic is now handled by MessageReactions component
  };

  const handleReplyToMessage = (messageId: string) => {
    setReplyingTo(messageId);
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleLongPress = (messageId: string) => {
    setSelectedMessage(messageId);
    // TODO: Show message options (copy, delete, forward, etc.)
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleMenuAction = (action: 'voice' | 'video' | 'mute' | 'block' | 'report') => {
    switch (action) {
      case 'voice':
        navigate(`/call/${id}?type=voice`);
        break;
      case 'video':
        navigate(`/call/${id}?type=video`);
        break;
      case 'mute':
        toast({
          title: "Muted",
          description: "Notifications muted for this chat.",
        });
        break;
      case 'block':
        toast({
          title: "User blocked",
          description: "User has been blocked successfully.",
        });
        break;
      case 'report':
        toast({
          title: "User reported",
          description: "Report has been submitted for review.",
        });
        break;
    }
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">Invalid chat</h3>
          <Button onClick={() => navigate("/chats")}>
            Back to Chats
          </Button>
        </div>
      </div>
    );
  }

  if (loadingPartner || loadingMessages) {
    return <FullScreenLoading text="Loading chat..." />;
  }

  if (!chatPartner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">Chat not found</h3>
          <Button onClick={() => navigate("/chats")}>
            Back to Chats
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ChatHeader 
        chatPartner={chatPartner}
        onBackClick={() => navigate("/chats")}
        onMenuAction={handleMenuAction}
      />

      {/* Scrollable Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-safe">
        {messages && messages.length > 0 ? (
          messages.map((message) => {
            const isOwn = message.sender_id === currentUserId; // Fixed: Compare with current user ID
            
            return (
              <div
                key={message.id}
                id={`message-${message.id}`}
                className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 relative ${
                    isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleLongPress(message.id);
                  }}
                 >
                   {message.message_type === 'image' && message.attachment_url ? (
                     <div 
                       className="cursor-pointer"
                       onClick={() => setMediaViewer({
                         isOpen: true,
                         url: message.attachment_url!,
                         type: "image",
                         title: "Chat Image"
                       })}
                     >
                       <img 
                         src={message.attachment_url} 
                         alt="Shared image" 
                         className="max-w-full rounded-lg"
                         style={{ maxHeight: '200px' }}
                       />
                       {message.content !== 'Image' && (
                         <p className="text-sm mt-2">{message.content}</p>
                       )}
                     </div>
                   ) : message.message_type === 'file' && message.attachment_url ? (
                     <div className="flex items-center space-x-2 p-2 bg-muted/50 rounded">
                       <FileText className="h-4 w-4" />
                       <a 
                         href={message.attachment_url} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="text-sm text-primary hover:underline flex-1"
                       >
                         {message.content}
                       </a>
                     </div>
                   ) : message.message_type === 'voice' && message.attachment_url ? (
                     <VoiceMessagePlayer audioUrl={message.attachment_url} />
                   ) : (
                     <p className="text-sm leading-relaxed">{message.content}</p>
                   )}
                   <div className="flex items-center justify-between mt-1">
                     <p className={`text-xs ${
                       isOwn 
                         ? "text-primary-foreground/70" 
                         : "text-muted-foreground"
                     }`}>
                       {formatTime(message.created_at)}
                     </p>
                   </div>
                   <MessageReactions 
                     messageId={message.id} 
                     messageType="direct" 
                   />
                 </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <h3 className="font-medium text-foreground mb-2">No messages yet</h3>
            <p className="text-sm text-muted-foreground">Start the conversation!</p>
          </div>
        )}
        
        {/* Auto-scroll target */}
        <div ref={setMessagesEndRef} />
      </div>

      {/* Reply Preview - Above sticky footer */}
      {replyingTo && (
        <div className="px-3 py-2 bg-muted/50 border-l-4 border-primary border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-primary font-medium">
                Replying to {messages?.find(m => m.id === replyingTo)?.sender_id === chatPartner.user_id ? chatPartner.full_name : "yourself"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {messages?.find(m => m.id === replyingTo)?.content}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(null)}
              className="h-6 w-6 p-0"
            >
              ✕
            </Button>
          </div>
        </div>
      )}

      {/* Voice Message Recorder */}
      {showVoiceRecorder && (
        <div className="sticky bottom-0 z-50 p-3 border-t border-border bg-card">
          <VoiceMessageRecorder
            onSend={handleVoiceMessageSend}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        </div>
      )}

      {/* Sticky Footer - Message Input */}
      <footer className="sticky bottom-0 z-50 p-3 border-t border-border bg-card">
        <div className="flex items-center space-x-2">
          {/* Attachment Menu */}
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => handleFileUpload("image")}
            >
              <Image className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => handleFileUpload("document")}
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => handleFileUpload("voice")}
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex-1 relative">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pr-10 h-9 text-sm"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            >
              <Smile className="h-3 w-3" />
            </Button>
          </div>
          
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            size="icon"
            className="h-8 w-8"
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={documentInputRef}
          type="file"
          accept="*/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {uploadAttachmentMutation.isPending && (
          <div className="text-xs text-muted-foreground text-center mt-2">
            Uploading file...
          </div>
        )}
      </footer>

      {/* Media Viewer */}
      <MediaViewer
        isOpen={mediaViewer.isOpen}
        onClose={() => setMediaViewer(prev => ({ ...prev, isOpen: false }))}
        mediaUrl={mediaViewer.url}
        mediaType={mediaViewer.type}
        title={mediaViewer.title}
      />
    </div>
  );
}