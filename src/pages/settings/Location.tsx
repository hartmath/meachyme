import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, Navigation, Globe, Shield, Eye, EyeOff, Users, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function Location() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Fetch user's location settings
  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      return profile;
    }
  });

  // Update location settings mutation
  const updateLocationMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({
        title: "Settings updated",
        description: "Your location preferences have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support location services.",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocoding to get address
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await response.json();
          
          const address = `${data.city || ''}, ${data.principalSubdivision || ''}, ${data.countryName || ''}`.replace(/^,\s*|,\s*$/g, '');
          
          setCurrentLocation({ lat: latitude, lng: longitude, address });
          
          // Update profile with location
          updateLocationMutation.mutate({
            location: address,
            latitude: latitude,
            longitude: longitude,
            location_updated_at: new Date().toISOString()
          });
          
        } catch (error) {
          console.error('Error getting address:', error);
          setCurrentLocation({ lat: latitude, lng: longitude, address: 'Location detected' });
        }
        
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        toast({
          title: "Location access denied",
          description: "Please allow location access to use this feature.",
          variant: "destructive"
        });
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const handleLocationToggle = (enabled: boolean) => {
    updateLocationMutation.mutate({
      location_sharing_enabled: enabled
    });
  };

  const handleVisibilityChange = (visibility: 'public' | 'contacts' | 'private') => {
    updateLocationMutation.mutate({
      location_visibility: visibility
    });
  };

  const locationSettings = [
    {
      title: "Share Location",
      description: "Allow others to see your general location",
      icon: <MapPin className="h-5 w-5" />,
      enabled: profile?.location_sharing_enabled || false,
      onToggle: handleLocationToggle
    },
    {
      title: "Show Distance",
      description: "Display distance to other users in your area",
      icon: <Navigation className="h-5 w-5" />,
      enabled: profile?.show_distance || false,
      onToggle: (enabled: boolean) => updateLocationMutation.mutate({ show_distance: enabled })
    },
    {
      title: "Event Location Sharing",
      description: "Share your location when attending events",
      icon: <Users className="h-5 w-5" />,
      enabled: profile?.event_location_sharing || false,
      onToggle: (enabled: boolean) => updateLocationMutation.mutate({ event_location_sharing: enabled })
    }
  ];

  const visibilityOptions = [
    {
      value: 'public',
      label: 'Everyone',
      description: 'All users can see your location',
      icon: <Globe className="h-4 w-4" />
    },
    {
      value: 'contacts',
      label: 'Contacts Only',
      description: 'Only your connections can see your location',
      icon: <Users className="h-4 w-4" />
    },
    {
      value: 'private',
      label: 'Private',
      description: 'No one can see your location',
      icon: <Shield className="h-4 w-4" />
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-foreground">Location Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your location preferences</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Current Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Current Location</span>
            </CardTitle>
            <CardDescription>
              Your current location information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile?.location ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{profile.location}</span>
                </div>
                {profile.location_updated_at && (
                  <p className="text-xs text-muted-foreground">
                    Last updated: {new Date(profile.location_updated_at).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  No location set
                </p>
              </div>
            )}
            
            <Button
              onClick={getCurrentLocation}
              disabled={isLoadingLocation}
              className="w-full"
              variant="outline"
            >
              {isLoadingLocation ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                  Getting Location...
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4 mr-2" />
                  {profile?.location ? 'Update Location' : 'Set Current Location'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Location Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Location Preferences</CardTitle>
            <CardDescription>
              Control how your location is shared and used
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {locationSettings.map((setting, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {setting.icon}
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{setting.title}</p>
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
                  </div>
                </div>
                <Switch
                  checked={setting.enabled}
                  onCheckedChange={setting.onToggle}
                  disabled={updateLocationMutation.isPending}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Location Visibility */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Location Visibility</span>
            </CardTitle>
            <CardDescription>
              Choose who can see your location
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibilityOptions.map((option) => (
              <div
                key={option.value}
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  profile?.location_visibility === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => handleVisibilityChange(option.value as any)}
              >
                <div className="p-2 bg-muted rounded-lg">
                  {option.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-foreground text-sm">{option.label}</p>
                    {profile?.location_visibility === option.value && (
                      <Badge variant="default" className="text-xs">Selected</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Privacy Notice */}
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-200 text-sm mb-1">
                  Privacy Notice
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  Your location data is encrypted and stored securely. We only share your general area, not your exact coordinates. 
                  You can change these settings at any time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
