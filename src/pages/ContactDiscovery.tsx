import { useState } from "react";
import { ArrowLeft, Search, QrCode, UserPlus, MapPin, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loading } from "@/components/Loading";

export default function ContactDiscovery() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  // Fetch all profiles for contact discovery
  const { data: profiles, isLoading } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return profiles;
    }
  });

  // Filter profiles based on search query
  const filteredProfiles = profiles?.filter(profile => 
    profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.user_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.business_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const nearbyProfiles = filteredProfiles.slice(0, 5);
  const roleBasedProfiles = filteredProfiles.slice(5, 10);

  const handleConnect = (userId: string) => {
    console.log("Connecting to user:", userId);
    // TODO: Send connection request or start chat
    navigate(`/chat/${userId}`);
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="flex items-center p-3 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/chats")}
          className="mr-2 h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">Find Contacts</h1>
      </header>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
          <Input
            placeholder="Search by name, role, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>

      {/* QR Code Section */}
      <div className="px-3 mb-4">
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <QrCode className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Quick Connect</h3>
                <p className="text-xs text-muted-foreground">Share or scan QR codes</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
              <QrCode className="h-3 w-3 mr-1" />
              My QR
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="nearby" className="px-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="nearby">Nearby</TabsTrigger>
          <TabsTrigger value="role">By Role</TabsTrigger>
        </TabsList>
        
        <TabsContent value="nearby" className="mt-3 space-y-2">
          <div className="flex items-center text-xs text-muted-foreground mb-3">
            <MapPin className="h-3 w-3 mr-1" />
            Event people near you
          </div>
          
          {isLoading ? (
            <Loading className="p-4" text="Loading contacts..." />
          ) : nearbyProfiles.length > 0 ? (
            nearbyProfiles.map((profile) => (
              <div key={profile.id} className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                      {profile.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt={profile.full_name || 'User'} 
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        getInitials(profile.full_name || 'User')
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-sm">{profile.full_name || 'Unknown User'}</h3>
                      <p className="text-xs text-primary font-medium">{profile.user_type || 'User'}</p>
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <MapPin className="h-2 w-2 mr-1" />
                        <span>{profile.location || 'Location not set'}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleConnect(profile.user_id)}
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Connect
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-4">
              <div className="text-muted-foreground text-sm">No contacts found</div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="role" className="mt-3 space-y-2">
          <div className="flex items-center text-xs text-muted-foreground mb-3">
            <Briefcase className="h-3 w-3 mr-1" />
            Professionals in your field
          </div>
          
          {isLoading ? (
            <Loading className="p-4" text="Loading professionals..." />
          ) : roleBasedProfiles.length > 0 ? (
            roleBasedProfiles.map((profile) => (
              <div key={profile.id} className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                      {profile.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt={profile.full_name || 'User'} 
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        getInitials(profile.full_name || 'User')
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-sm">{profile.full_name || 'Unknown User'}</h3>
                      <p className="text-xs text-primary font-medium">{profile.user_type || 'User'}</p>
                      <p className="text-xs text-muted-foreground">{profile.business_name || 'Independent'}</p>
                      {profile.category && (
                        <Badge variant="secondary" className="mt-1 text-xs h-4 px-1">
                          {profile.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleConnect(profile.user_id)}
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Connect
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-4">
              <div className="text-muted-foreground text-sm">No professionals found</div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}