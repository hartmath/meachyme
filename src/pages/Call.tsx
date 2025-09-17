import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { CallInterface } from "@/components/CallInterface";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loading } from "@/components/Loading";
import { CallType } from "@/utils/webrtc";

export default function Call() {
  const { id: recipientId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const callType = (searchParams.get('type') || 'voice') as CallType;
  const incomingCallId = searchParams.get('callId') || recipientId;
  const isIncoming = searchParams.get('incoming') === 'true';
  const callerName = searchParams.get('callerName') || '';
  const callerAvatar = searchParams.get('callerAvatar') || '';
  
  const [activeCall, setActiveCall] = useState<{
    callId: string | null;
    recipientId: string | null;
    recipientName: string;
    recipientAvatar?: string;
    callType: CallType;
    isIncoming: boolean;
  } | null>(null);

  // Fetch recipient profile
  const { data: recipientProfile, isLoading } = useQuery({
    queryKey: ['call-recipient', recipientId],
    queryFn: async () => {
      if (!recipientId) return null;
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', recipientId)
        .single();

      if (error) throw error;
      return profile;
    },
    enabled: !!recipientId
  });

  useEffect(() => {
    if (isIncoming && callerName) {
      // For incoming calls, use the caller info from URL params
      setActiveCall({
        callId: incomingCallId,
        recipientId: recipientId || null,
        recipientName: callerName,
        recipientAvatar: callerAvatar || undefined,
        callType,
        isIncoming
      });
    } else if (recipientProfile) {
      // For outgoing calls, use the recipient profile
      setActiveCall({
        callId: incomingCallId,
        recipientId: recipientId || null,
        recipientName: recipientProfile.full_name || 'Unknown User',
        recipientAvatar: recipientProfile.avatar_url,
        callType,
        isIncoming
      });
    }
  }, [recipientProfile, recipientId, callType, incomingCallId, isIncoming, callerName, callerAvatar]);


  const handleCallEnd = () => {
    navigate('/calls');
  };

  const handleCallAnswer = () => {
    // Call answered, continue with the active call
    console.log('Call answered');
  };

  if (isLoading) {
    return <Loading className="min-h-screen" text="Loading call..." />;
  }

  if (!recipientId && !isIncoming) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">Invalid call</h3>
          <button onClick={() => navigate("/calls")}>
            Back to Calls
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Active call interface - only show when there's an active call */}
      {activeCall && (
        <CallInterface
          callId={activeCall.callId}
          recipientId={activeCall.recipientId}
          recipientName={activeCall.recipientName}
          recipientAvatar={activeCall.recipientAvatar}
          callType={activeCall.callType}
          isIncoming={activeCall.isIncoming}
          onCallEnd={handleCallEnd}
          onCallDecline={handleCallEnd}
          onCallAnswer={handleCallAnswer}
        />
      )}
    </div>
  );
}