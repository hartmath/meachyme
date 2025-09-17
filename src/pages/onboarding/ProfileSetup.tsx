import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Camera, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ProfileSetup() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { completeOnboarding, user } = useAuth();
  const { toast } = useToast();

  // Redirect if user is not authenticated
  if (!user) {
    navigate("/auth");
    return null;
  }
  
  const selectedRole = location.state?.role || "organizer";
  const roleLabels = {
    vendor: "Vendor",
    organizer: "Event Organizer", 
    venue: "Venue Owner",
    attendee: "Attendee"
  };

  // Mutation to save profile data
  const saveProfileMutation = useMutation({
    mutationFn: async ({ name, bio, role, avatarFile }: { 
      name: string; 
      bio: string; 
      role: string; 
      avatarFile?: File | null;
    }) => {
      if (!user) throw new Error('User not authenticated');

      let avatarUrl = null;

      // Upload avatar if provided
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, avatarFile);

        if (uploadError) {
          console.error('Avatar upload error:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(fileName);
        
        avatarUrl = publicUrl;
      }

      // Save profile data
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: name.trim(),
          bio: bio.trim() || null,
          user_type: role,
          avatar_url: avatarUrl,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Profile save error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Profile saved successfully!",
        description: "Your profile has been set up.",
      });
      
      // Mark onboarding as completed
      completeOnboarding();
      
      navigate("/chats"); // Complete onboarding and go to main messaging
    },
    onError: (error) => {
      toast({
        title: "Failed to save profile",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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

      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleComplete = () => {
    if (name.trim()) {
      saveProfileMutation.mutate({ 
        name: name.trim(), 
        bio: bio.trim(), 
        role: selectedRole,
        avatarFile 
      });
    } else {
      toast({
        title: "Name required",
        description: "Please enter your name to continue.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <header className="flex items-center mb-8 pt-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/onboarding/role-selection")}
          className="mr-4"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center space-x-3 flex-1">
          <img 
            src="/mea-logo.jpg" 
            alt="MEA Chyme Logo" 
            className="w-8 h-8 rounded-full object-cover"
          />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Setup Your Profile</h1>
            <p className="text-muted-foreground">Tell us a bit about yourself</p>
          </div>
        </div>
      </header>

      {/* Profile Form */}
      <div className="space-y-6">
        {/* Avatar Section */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center overflow-hidden">
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="Profile preview" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
              id="avatar-upload"
            />
            <Button
              size="icon"
              variant="secondary"
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full"
              onClick={() => document.getElementById('avatar-upload')?.click()}
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Selected Role Display */}
        <div className="text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            {roleLabels[selectedRole as keyof typeof roleLabels]}
          </div>
        </div>

        {/* Name Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Full Name *
          </label>
          <Input
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-base"
          />
        </div>

        {/* Bio Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Bio (Optional)
          </label>
          <Textarea
            placeholder="Tell people about yourself and your experience..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="min-h-[100px] text-base resize-none"
            maxLength={160}
          />
          <div className="text-xs text-muted-foreground text-right">
            {bio.length}/160
          </div>
        </div>

        {/* Info Text */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Your profile information helps other event professionals find and connect with you. 
            You can always update this later in settings.
          </p>
        </div>
      </div>

      {/* Complete Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <Button 
          onClick={handleComplete}
          disabled={!name.trim() || saveProfileMutation.isPending}
          className="w-full"
          size="lg"
        >
          {saveProfileMutation.isPending ? "Saving..." : "Complete Setup"}
        </Button>
      </div>
    </div>
  );
}