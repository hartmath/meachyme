import { Heart, MessageCircle, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface StatusInteractionsProps {
  statusId: string;
  initialLikes?: number;
  initialComments?: number;
  initialShares?: number;
  userLiked?: boolean;
  userShared?: boolean;
}

export function StatusInteractions({ 
  statusId, 
  initialLikes = 0, 
  initialComments = 0, 
  initialShares = 0,
  userLiked = false,
  userShared = false
}: StatusInteractionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  // Fetch comments for this status
  const { data: comments } = useQuery({
    queryKey: ['status-comments', statusId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_comments')
        .select(`
          id,
          content,
          created_at,
          profiles!status_comments_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('status_id', statusId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: showComments
  });

  // Fetch interaction counts
  const { data: interactions } = useQuery({
    queryKey: ['status-interactions', statusId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_status_interactions', { status_id_param: statusId });
      
      if (error) throw error;
      return data[0] || { like_count: 0, comment_count: 0, share_count: 0, user_liked: false, user_shared: false };
    },
    initialData: { 
      like_count: initialLikes, 
      comment_count: initialComments, 
      share_count: initialShares, 
      user_liked: userLiked, 
      user_shared: userShared 
    }
  });

  // Like/Unlike mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (interactions?.user_liked) {
        // Unlike
        const { error } = await supabase
          .from('status_likes')
          .delete()
          .eq('status_id', statusId)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('status_likes')
          .insert({
            status_id: statusId,
            user_id: user.id
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-interactions', statusId] });
      queryClient.invalidateQueries({ queryKey: ['status-posts'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (interactions?.user_shared) {
        // Unshare
        const { error } = await supabase
          .from('status_shares')
          .delete()
          .eq('status_id', statusId)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        // Share
        const { error } = await supabase
          .from('status_shares')
          .insert({
            status_id: statusId,
            user_id: user.id
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-interactions', statusId] });
      queryClient.invalidateQueries({ queryKey: ['status-posts'] });
      toast({
        title: interactions?.user_shared ? "Unshared" : "Shared!",
        description: interactions?.user_shared ? "Status unshared" : "Status shared successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('status_comments')
        .insert({
          status_id: statusId,
          user_id: user.id,
          content: content
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-interactions', statusId] });
      queryClient.invalidateQueries({ queryKey: ['status-posts'] });
      queryClient.invalidateQueries({ queryKey: ['status-comments', statusId] });
      setCommentText("");
      toast({
        title: "Comment added!",
        description: "Your comment has been posted"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleLike = () => {
    likeMutation.mutate();
  };

  const handleShare = () => {
    shareMutation.mutate();
  };

  const handleComment = () => {
    if (commentText.trim()) {
      commentMutation.mutate(commentText.trim());
    }
  };

  return (
    <div className="space-y-3">
      {/* Interaction Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 ${interactions?.user_liked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={handleLike}
            disabled={likeMutation.isPending}
          >
            <Heart className={`h-3 w-3 mr-1 ${interactions?.user_liked ? 'fill-current' : ''}`} />
            <span className="text-xs">{interactions?.like_count || 0}</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-foreground h-8 px-2"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            <span className="text-xs">{interactions?.comment_count || 0}</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-8 px-2 ${interactions?.user_shared ? 'text-blue-500' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={handleShare}
            disabled={shareMutation.isPending}
          >
            <Share className={`h-3 w-3 ${interactions?.user_shared ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-border pt-3">
          {/* Add Comment */}
          <div className="flex items-center space-x-2 mb-3">
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyPress={(e) => e.key === 'Enter' && handleComment()}
            />
            <Button
              size="sm"
              onClick={handleComment}
              disabled={!commentText.trim() || commentMutation.isPending}
              className="h-8 px-3"
            >
              {commentMutation.isPending ? 'Posting...' : 'Post'}
            </Button>
          </div>
          
          {/* Comments List */}
          <div className="space-y-3">
            {comments && comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-semibold">
                    {comment.profiles?.avatar_url ? (
                      <img 
                        src={comment.profiles.avatar_url} 
                        alt={comment.profiles.full_name || 'User'} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      (comment.profiles?.full_name || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="bg-muted rounded-lg p-2">
                      <p className="text-sm font-medium text-foreground">
                        {comment.profiles?.full_name || 'Unknown User'}
                      </p>
                      <p className="text-sm text-foreground mt-1">
                        {comment.content}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(comment.created_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground text-center py-2">
                No comments yet. Be the first to comment!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
