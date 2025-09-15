import { Heart, MessageCircle, Share, Plus, Camera, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loading } from "@/components/Loading";
import { StatusInteractions } from "@/components/StatusInteractions";
import { useEffect } from "react";

export default function Feed() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch current user profile
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

  // Fetch current user's recent status posts
  const { data: myStatusPosts } = useQuery({
    queryKey: ['my-status-posts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: posts } = await supabase
        .from('status_posts')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString()) // Only non-expired posts
        .order('created_at', { ascending: false })
        .limit(1); // Get the most recent one

      return posts || [];
    }
  });

  // Fetch status posts from people you've messaged + your own posts
  const { data: statusPosts, isLoading } = useQuery({
    queryKey: ['status-posts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get users I've communicated with
      const { data: conversations } = await supabase
        .from('direct_messages')
        .select('sender_id, recipient_id')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);

      // Get unique user IDs from conversations (including current user)
      const contactUserIds = [...new Set(
        conversations
          ?.map(conv => conv.sender_id === user.id ? conv.recipient_id : conv.sender_id)
          .filter(id => id !== user.id) || []
      )];

      // Always include current user's posts
      const userIdsToFetch = [...contactUserIds, user.id];

      // Get status posts from contacts + current user
      const { data: posts, error: postsError } = await supabase
        .from('status_posts')
        .select('*')
        .in('user_id', userIdsToFetch)
        .gt('expires_at', new Date().toISOString()) // Only show non-expired posts
        .order('created_at', { ascending: false })
        .limit(20);

      if (postsError) throw postsError;

      // Get profiles for each post
      const postsWithProfiles = await Promise.all(
        (posts || []).map(async (post) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, user_type')
            .eq('user_id', post.user_id)
            .maybeSingle();
          
          return { ...post, profile };
        })
      );

      return postsWithProfiles;
    }
  });

  // Set up real-time subscription for new status posts
  useEffect(() => {
    const channel = supabase
      .channel('status_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'status_posts'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['status-posts'] });
          queryClient.invalidateQueries({ queryKey: ['my-status-posts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Mutation to mark status as viewed
  const markAsViewedMutation = useMutation({
    mutationFn: async (statusId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Try to insert, ignore if already exists
      await supabase
        .from('status_views')
        .insert({
          status_id: statusId,
          viewer_id: user.id
        });
    }
  });

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const handleStatusView = (statusId: string) => {
    markAsViewedMutation.mutate(statusId);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border z-40">
        <div className="flex items-center justify-between p-3">
          <h1 className="text-xl font-bold">Status</h1>
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <Camera className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* My Status */}
      <div className="p-3 border-b border-border">
        <div
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => navigate("/create-status")}
        >
          <div className="relative">
            {currentProfile?.avatar_url ? (
              <img 
                src={currentProfile.avatar_url} 
                alt={currentProfile.full_name || 'You'} 
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                {getInitials(currentProfile?.full_name || 'You')}
              </div>
            )}
            {myStatusPosts && myStatusPosts.length > 0 ? (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            ) : (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <Plus className="h-2.5 w-2.5 text-primary-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-foreground text-sm">My status</h3>
            {myStatusPosts && myStatusPosts.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Active • {getTimeAgo(myStatusPosts[0].created_at)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Tap to add status update</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Updates */}
      <div className="p-3">
        <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
          Recent updates
        </h3>
        
        {/* Status Stories */}
        <div className="space-y-2 mb-4">
          {isLoading ? (
            <Loading className="p-4" text="Loading updates..." />
          ) : statusPosts && statusPosts.length > 0 ? (
            statusPosts.slice(0, 5).map((post) => (
              <div
                key={post.id}
                className="flex items-center p-2 rounded-lg hover:bg-accent cursor-pointer"
                onClick={() => handleStatusView(post.id)}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold mr-3 ring-2 ring-primary bg-primary text-primary-foreground text-sm">
                  {post.profile?.avatar_url ? (
                    <img 
                      src={post.profile.avatar_url} 
                      alt={post.profile.full_name || 'User'} 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials(post.profile?.full_name || 'User')
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground text-sm">
                    {post.profile?.full_name || 'Unknown User'}
                  </h3>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span className="text-primary font-medium mr-1 capitalize">
                      {post.profile?.user_type?.replace('_', ' ') || 'User'}
                    </span>
                    <span>• {getTimeAgo(post.created_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {post.content}
                  </p>
                </div>
                
                <div className="flex items-center text-xs text-muted-foreground">
                  <Eye className="h-3 w-3 mr-1" />
                  <span>{post.view_count}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-4">
              <div className="text-muted-foreground text-sm">No status updates yet</div>
              <p className="text-xs text-muted-foreground mt-1">Be the first to share an update!</p>
            </div>
          )}
        </div>
      </div>

      {/* Feed Posts */}
      <div className="border-t border-border">
        <div className="p-3">
          <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
            Community Posts
          </h3>
        </div>
        
        <div className="divide-y divide-border">
          {isLoading ? (
            <Loading className="p-8" text="Loading posts..." />
          ) : statusPosts && statusPosts.length > 0 ? (
            statusPosts.map((post) => (
              <article key={post.id} className="p-3">
                {/* Post Header */}
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold mr-2 text-sm">
                    {post.profile?.avatar_url ? (
                      <img 
                        src={post.profile.avatar_url} 
                        alt={post.profile.full_name || 'User'} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(post.profile?.full_name || 'User')
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground text-sm">
                      {post.profile?.full_name || 'Unknown User'}
                    </h3>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span className="text-primary font-medium mr-1 capitalize">
                        {post.profile?.user_type?.replace('_', ' ') || 'User'}
                      </span>
                      <span>• {getTimeAgo(post.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Status Content */}
                <div className="mb-3">
                  <div 
                    className="rounded-2xl p-4 text-white relative overflow-hidden"
                    style={{ backgroundColor: post.background_color }}
                  >
                    {post.media_url ? (
                      <div className="space-y-3">
                        <img 
                          src={post.media_url} 
                          alt="Status media" 
                          className="w-full rounded-lg object-cover"
                        />
                        {post.content && (
                          <p className="text-sm leading-relaxed font-medium">
                            {post.content}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed font-medium">
                        {post.content}
                      </p>
                    )}
                    <div className="absolute top-2 right-2 bg-black/20 rounded-full px-2 py-1">
                      <span className="text-xs font-medium">
                        {post.media_type === 'text' ? '📝' : '📸'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Post Actions */}
                <StatusInteractions 
                  statusId={post.id}
                  initialLikes={0}
                  initialComments={0}
                  initialShares={0}
                />
                
                <div className="flex items-center justify-end text-xs text-muted-foreground mt-2">
                    <Eye className="h-3 w-3 mr-1" />
                    <span>{post.view_count} views</span>
                </div>
              </article>
            ))
          ) : (
            <div className="text-center p-8">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-foreground mb-2">No status posts yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Be the first to share what's happening in your event world!</p>
              <Button onClick={() => navigate("/create-status")}>
                <Plus className="h-4 w-4 mr-2" />
                Create Status
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}