import { useEffect, useState } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CallData } from "@/utils/webrtc";

interface IncomingCallModalProps {
  onAnswer: (callId: string, callType: 'voice' | 'video', callerName: string, callerAvatar?: string) => void;
  onDecline: (callId: string) => void;
}

export function IncomingCallModal({ onAnswer, onDecline }: IncomingCallModalProps) {
  const queryClient = useQueryClient();
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const [callerInfo, setCallerInfo] = useState<{ name: string; avatar?: string } | null>(null);

  // Listen for incoming calls
  useEffect(() => {
    let callChannel: any;

    const setupCallListener = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Listen for calls where current user is the callee
      callChannel = supabase
        .channel('incoming_calls')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'calls',
            filter: `callee_id=eq.${user.id}`
          },
          async (payload) => {
            const newCall = payload.new as CallData;
            if (newCall.status === 'calling') {
              setIncomingCall(newCall);
              
              // Fetch caller info
              const { data: callerProfile } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('user_id', newCall.caller_id)
                .single();

              setCallerInfo({
                name: callerProfile?.full_name || 'Unknown Caller',
                avatar: callerProfile?.avatar_url
              });
            }
          }
        )
        .subscribe();

      // Also listen for call updates (declined, ended, etc.)
      const callUpdateChannel = supabase
        .channel('call_updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'calls',
            filter: `callee_id=eq.${user.id}`
          },
          (payload) => {
            const updatedCall = payload.new as CallData;
            if (updatedCall.id === incomingCall?.id && 
                (updatedCall.status === 'declined' || updatedCall.status === 'ended' || updatedCall.status === 'missed')) {
              setIncomingCall(null);
              setCallerInfo(null);
            }
          }
        )
        .subscribe();
    };

    setupCallListener();

    return () => {
      if (callChannel) {
        supabase.removeChannel(callChannel);
      }
    };
  }, [incomingCall?.id]);

  // Auto-decline call after 30 seconds
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (incomingCall) {
      timeout = setTimeout(() => {
        handleDecline();
      }, 30000); // 30 seconds
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [incomingCall]);

  const handleAnswer = () => {
    if (incomingCall && callerInfo) {
      onAnswer(incomingCall.id, incomingCall.call_type as 'voice' | 'video', callerInfo.name, callerInfo.avatar);
      setIncomingCall(null);
      setCallerInfo(null);
    }
  };

  const handleDecline = async () => {
    if (incomingCall) {
      // Update call status to missed
      await supabase
        .from('calls')
        .update({ 
          status: 'missed',
          ended_at: new Date().toISOString()
        })
        .eq('id', incomingCall.id);

      onDecline(incomingCall.id);
      setIncomingCall(null);
      setCallerInfo(null);
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  if (!incomingCall || !callerInfo) {
    return null;
  }

  return (
    <Dialog open={!!incomingCall} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm mx-auto bg-gradient-to-b from-primary/20 to-primary/40 border-none">
        <div className="text-center p-6">
          {/* Caller avatar */}
          <div className="mb-6">
            {callerInfo.avatar ? (
              <img 
                src={callerInfo.avatar} 
                alt={callerInfo.name}
                className="w-24 h-24 rounded-full mx-auto"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto">
                {getInitials(callerInfo.name)}
              </div>
            )}
          </div>

          {/* Call info */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-white mb-2">{callerInfo.name}</h3>
            <p className="text-white/80">
              Incoming {incomingCall.call_type} call...
            </p>
          </div>

          {/* Call controls */}
          <div className="flex justify-center space-x-8">
            <Button
              size="lg"
              variant="outline"
              className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 border-white text-white"
              onClick={handleDecline}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              size="lg"
              className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600"
              onClick={handleAnswer}
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}