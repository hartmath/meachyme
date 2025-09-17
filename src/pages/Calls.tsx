import { Phone, PhoneCall, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video, Search, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loading } from "@/components/Loading";
import { CallHistory } from "@/components/CallHistory";

export default function Calls() {
  const navigate = useNavigate();

  // Fetch contacts from people who have messaged with the user
  const { data: contacts, isLoading } = useQuery({
    queryKey: ['call-contacts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get users I've communicated with
      const { data: conversations } = await supabase
        .from('direct_messages')
        .select('sender_id, recipient_id')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);

      if (!conversations || conversations.length === 0) return [];

      // Get unique user IDs from conversations (excluding current user)
      const contactUserIds = [...new Set(
        conversations
          .map(conv => conv.sender_id === user.id ? conv.recipient_id : conv.sender_id)
          .filter(id => id !== user.id)
      )];

      if (contactUserIds.length === 0) return [];

      // Get profiles for contacts
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', contactUserIds);

      if (error) throw error;

      return profiles?.map(profile => ({
        id: profile.user_id,
        name: profile.full_name || 'Unknown User',
        role: profile.user_type || 'User',
        avatar: profile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U',
        avatar_url: profile.avatar_url
      })) || [];
    }
  });

  const handleCall = (contactId: string, type: 'voice' | 'video') => {
    // Navigate to call interface
    navigate(`/call/${contactId}?type=${type}`);
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Calls</h1>
          <Button size="icon" variant="ghost">
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="p-4 space-y-3">
        <Button className="w-full justify-start" variant="outline">
          <PhoneCall className="h-4 w-4 mr-3" />
          New Call
        </Button>
        <Button className="w-full justify-start" variant="outline">
          <Video className="h-4 w-4 mr-3" />
          MEA Meet
        </Button>
      </div>

      {/* Call Tabs */}
      <Tabs defaultValue="recent" className="px-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="recent" className="mt-4">
          {/* Call History */}
          <CallHistory />
        </TabsContent>
        
        <TabsContent value="contacts" className="mt-4">
          {/* Contacts for Calling */}
          <div className="space-y-1">
            {isLoading ? (
              <Loading className="p-8" text="Loading contacts..." />
            ) : contacts && contacts.length > 0 ? (
              contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center p-3 rounded-lg hover:bg-accent"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold mr-3 text-sm">
                    {contact.avatar_url ? (
                      <img 
                        src={contact.avatar_url} 
                        alt={contact.name} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(contact.name)
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{contact.name}</h3>
                    <p className="text-sm text-primary font-medium">{contact.role}</p>
                    <p className="text-xs text-muted-foreground">Available for calls</p>
                  </div>

                  {/* Call Actions */}
                  <div className="flex space-x-2">
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => handleCall(contact.id, 'voice')}
                      title="Voice call"
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => handleCall(contact.id, 'video')}
                      title="MEA Meet"
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => navigate(`/chat/${contact.id}`)}
                      title="Send message"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16">
                <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No contacts yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Start chatting with people to see them in your contacts for calling.
                </p>
                <Button onClick={() => navigate("/contact-discovery")}>
                  Find Contacts
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}