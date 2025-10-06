import { PhoneIncoming, PhoneOutgoing, PhoneMissed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loading } from "@/components/Loading";

export function CallHistory() {
  const navigate = useNavigate();

  // Fetch recent calls
  const { data: recentCalls, isLoading } = useQuery({
    queryKey: ['recent-calls'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get calls where user is either caller or callee
      const { data: calls, error } = await supabase
        .from('calls')
        .select('*')
        .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (!calls || calls.length === 0) return [];

      // Get unique user IDs from calls (excluding current user)
      const userIds = [...new Set(
        calls
          .map(call => call.caller_id === user.id ? call.callee_id : call.caller_id)
          .filter(id => id !== user.id)
      )];

      // Fetch profiles for these users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      // Create a map of profiles for quick lookup
      const profileMap = new Map(
        profiles?.map(profile => [profile.id, profile]) || []
      );

      return calls.map(call => {
        const isIncoming = call.callee_id === user.id;
        const otherUserId = isIncoming ? call.caller_id : call.callee_id;
        const otherUser = profileMap.get(otherUserId);
        
        return {
          ...call,
          isIncoming,
          otherUser: {
            id: otherUserId,
            name: otherUser?.full_name || 'Unknown User',
            avatar_url: otherUser?.avatar_url
          }
        };
      });
    }
  });

  const getCallIcon = (call: any) => {
    if (call.status === 'missed') {
      return <PhoneMissed className="h-4 w-4 text-red-500" />;
    }
    return call.isIncoming 
      ? <PhoneIncoming className="h-4 w-4 text-green-500" />
      : <PhoneOutgoing className="h-4 w-4 text-blue-500" />;
  };

  const getCallStatusText = (call: any) => {
    switch (call.status) {
      case 'answered':
      case 'ended':
        return formatDuration(call.duration_seconds || 0);
      case 'missed':
        return 'Missed';
      case 'declined':
        return 'Declined';
      case 'calling':
        return 'Calling...';
      default:
        return call.status;
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCallTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  const handleCallBack = (call: any) => {
    if (call.otherUser?.id) {
      navigate(`/call/${call.otherUser.id}?type=${call.call_type}`);
    }
  };

  if (isLoading) {
    return <Loading className="p-8" text="Loading call history..." />;
  }

  if (!recentCalls || recentCalls.length === 0) {
    return (
      <div className="text-center py-16">
        <PhoneOutgoing className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No calls yet</h3>
        <p className="text-muted-foreground text-center">
          Your call history will appear here after you make or receive calls.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {recentCalls.map((call) => (
        <div
          key={call.id}
          className="flex items-center p-3 rounded-lg hover:bg-accent cursor-pointer"
          onClick={() => handleCallBack(call)}
        >
          {/* Call direction icon */}
          <div className="mr-3">
            {getCallIcon(call)}
          </div>

          {/* Avatar */}
          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold mr-3 text-sm">
            {call.otherUser.avatar_url ? (
              <img 
                src={call.otherUser.avatar_url} 
                alt={call.otherUser.name} 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(call.otherUser.name)
            )}
          </div>

          {/* Call info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground truncate">{call.otherUser.name}</h3>
              <p className="text-xs text-muted-foreground">{formatCallTime(call.started_at)}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground capitalize">
                {call.call_type} • {getCallStatusText(call)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}