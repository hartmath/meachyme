import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Camera, Save, Upload, Paperclip, Smile, Send, Image, FileText, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { MediaViewer } from "@/components/MediaViewer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loading } from "@/components/Loading";

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Fetch current user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return profile;
    }
  });

  // Initialize profile data from Supabase
  const [profileData, setProfileData] = useState({
    name: "",
    role: "",
    bio: "",
    location: "",
    phone: ""
  });

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      setProfileData({
        name: profile.full_name || "",
        role: profile.user_type || "",
        bio: profile.bio || "",
        location: profile.location || "",
        phone: profile.phone || ""
      });
      setProfileImage(profile.avatar_url);
    }
  }, [profile]);

  // Mutation to update profile
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.name,
          user_type: data.role,
          bio: data.bio,
          location: data.location,
          phone: data.phone,
          avatar_url: profileImage
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      navigate("/profile");
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Mutation to upload avatar image
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file, {
          upsert: true // Replace existing file
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      return publicUrl;
    },
    onSuccess: (publicUrl) => {
      setProfileImage(publicUrl);
      toast({
        title: "Image uploaded",
        description: "Your profile photo has been updated.",
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
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

      uploadAvatarMutation.mutate(file);
    }
  };

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile")}
              className="mr-2 h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Edit Profile</h1>
          </div>
        </header>
        <Loading className="p-8" text="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
            className="mr-2 h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Edit Profile</h1>
        </div>
        <Button onClick={handleSave} size="sm" className="h-8 px-3 text-xs" disabled={updateProfileMutation.isPending}>
          <Save className="h-3 w-3 mr-1" />
          Save
        </Button>
      </header>

      {/* Profile Photo Section */}
      <div className="p-4 bg-card border-b border-border">
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="w-20 h-20 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold">
                {getInitials(profileData.name)}
              </div>
            )}
            <Button
              size="icon"
              variant="secondary"
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full"
              onClick={triggerImageUpload}
            >
              <Camera className="h-3 w-3" />
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-3 text-xs"
            onClick={triggerImageUpload}
          >
            <Upload className="h-3 w-3 mr-1" />
            Change Photo
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
          <Input
            id="name"
            value={profileData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className="h-9 text-sm"
            placeholder="Enter your full name"
          />
        </div>

        {/* Role */}
        <div className="space-y-2">
          <Label htmlFor="role" className="text-sm font-medium">Role</Label>
          <Input
            id="role"
            value={profileData.role}
            onChange={(e) => handleInputChange("role", e.target.value)}
            className="h-9 text-sm"
            placeholder="Your professional role"
          />
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
          <Textarea
            id="bio"
            value={profileData.bio}
            onChange={(e) => handleInputChange("bio", e.target.value)}
            className="min-h-[80px] text-sm resize-none"
            placeholder="Tell others about yourself..."
            maxLength={300}
          />
          <div className="text-xs text-muted-foreground text-right">
            {profileData.bio.length}/300
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location" className="text-sm font-medium">Location</Label>
          <Input
            id="location"
            value={profileData.location}
            onChange={(e) => handleInputChange("location", e.target.value)}
            className="h-9 text-sm"
            placeholder="City, Country"
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            value={profileData.phone}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            className="h-9 text-sm"
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-4 py-3 mt-4">
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            Your profile information helps others connect with you and understand your role in the event industry.
          </p>
        </div>
      </div>
    </div>
  );
}