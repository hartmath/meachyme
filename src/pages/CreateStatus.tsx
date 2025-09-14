import { useState, useRef } from "react";
import { ArrowLeft, Camera, Type, Smile, Send, Image, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function CreateStatus() {
  const [statusText, setStatusText] = useState("");
  const [statusType, setStatusType] = useState<"text" | "image">("text");
  const [statusMedia, setStatusMedia] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current user profile
  const { data: currentProfile } = useQuery({
    queryKey: ['current-user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      return profile;
    }
  });

  // Mutation to upload status media
  const uploadMediaMutation = useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/status-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('status-media')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('status-media')
        .getPublicUrl(fileName);

      return publicUrl;
    },
    onSuccess: (publicUrl) => {
      setStatusMedia(publicUrl);
      toast({
        title: "Media uploaded",
        description: "Your image has been added to the status.",
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

  // Mutation to create status post
  const createStatusMutation = useMutation({
    mutationFn: async ({ content, mediaType, mediaUrl }: { content: string; mediaType: string; mediaUrl?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('status_posts')
        .insert({
          user_id: user.id,
          content: content,
          media_type: mediaType,
          media_url: mediaUrl,
          background_color: '#3B82F6'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate queries to refresh the feed
      queryClient.invalidateQueries({ queryKey: ['status-posts'] });
      queryClient.invalidateQueries({ queryKey: ['my-status-posts'] });
      
      toast({
        title: "Status posted!",
        description: "Your status update has been shared.",
      });
      navigate("/feed");
    },
    onError: (error) => {
      toast({
        title: "Failed to post status",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handlePost = () => {
    if (statusText.trim() || (statusType === "image" && statusMedia)) {
      createStatusMutation.mutate({ 
        content: statusText.trim(), 
        mediaType: statusType,
        mediaUrl: statusMedia || undefined
      });
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB.",
          variant: "destructive"
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive"
        });
        return;
      }

      uploadMediaMutation.mutate(file);
    }
  };

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  const removeMedia = () => {
    setStatusMedia(null);
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/feed")}
            className="mr-2 h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Create Status</h1>
        </div>
        <Button
          onClick={handlePost}
          disabled={(!statusText.trim() && !statusMedia) || createStatusMutation.isPending}
          size="sm"
          className="h-8 px-3 text-xs"
        >
          <Send className="h-3 w-3 mr-1" />
          {createStatusMutation.isPending ? 'Posting...' : 'Post'}
        </Button>
      </header>

      {/* Content */}
      <div className="p-3">
        {/* User Info */}
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold mr-2 text-sm">
            {currentProfile?.avatar_url ? (
              <img 
                src={currentProfile.avatar_url} 
                alt={currentProfile.full_name || 'You'} 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(currentProfile?.full_name || 'You')
            )}
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">
              {currentProfile?.full_name || 'Your Name'}
            </h3>
            <p className="text-xs text-primary font-medium capitalize">
              {currentProfile?.user_type?.replace('_', ' ') || 'User'}
            </p>
          </div>
        </div>

        {/* Content Type Selector */}
        <div className="flex items-center space-x-2 mb-4">
          <Button
            variant={statusType === "text" ? "default" : "outline"}
            onClick={() => setStatusType("text")}
            className="flex-1 h-8 text-xs"
          >
            <Type className="h-3 w-3 mr-1" />
            Text
          </Button>
          <Button
            variant={statusType === "image" ? "default" : "outline"}
            onClick={() => setStatusType("image")}
            className="flex-1 h-8 text-xs"
          >
            <Camera className="h-3 w-3 mr-1" />
            Photo
          </Button>
        </div>

        {/* Text Input */}
        {statusType === "text" && (
          <div className="mb-4">
            <Textarea
              placeholder="Share what's happening in your event world..."
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              className="min-h-[120px] text-sm resize-none border focus:border-primary"
              maxLength={300}
              autoFocus
            />
            <div className="flex items-center justify-between mt-2">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <Smile className="h-3 w-3 mr-1" />
                Add emoji
              </Button>
              <div className="text-xs text-muted-foreground">
                {statusText.length}/300
              </div>
            </div>
          </div>
        )}

        {/* Photo Upload */}
        {statusType === "image" && (
          <div className="mb-4">
            {statusMedia ? (
              <div className="relative">
                <img 
                  src={statusMedia} 
                  alt="Status media" 
                  className="w-full aspect-square object-cover rounded-lg"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 rounded-full"
                  onClick={removeMedia}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div 
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={triggerImageUpload}
              >
                <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2 text-sm">Add a photo</h3>
                <p className="text-muted-foreground mb-3 text-xs">Share a moment from your event world</p>
                <Button size="sm" className="h-8 px-3 text-xs" onClick={(e) => e.stopPropagation()}>
                  <Camera className="h-3 w-3 mr-1" />
                  Choose Photo
                </Button>
              </div>
            )}
            
            <div className="mt-3">
              <Textarea
                placeholder="Add a caption..."
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                className="min-h-[80px] text-sm resize-none"
                maxLength={300}
              />
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {uploadMediaMutation.isPending && (
              <div className="mt-2 text-xs text-muted-foreground text-center">
                Uploading image...
              </div>
            )}
          </div>
        )}

        {/* Privacy Info */}
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            Your status will be visible to your contacts for 24 hours. You can delete it anytime from your profile.
          </p>
        </div>
      </div>
    </div>
  );
}