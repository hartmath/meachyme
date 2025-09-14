import { 
  Edit2, 
  MapPin, 
  Calendar, 
  Users, 
  FileText, 
  Bell, 
  Shield, 
  HardDrive, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loading } from "@/components/Loading";

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut } = useAuth();

  // Fetch current user profile
  const { data: profile, isLoading, error } = useQuery({
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

  const handleMenuAction = (action: string) => {
    console.log("Menu action:", action);
    
    switch (action) {
      case "privacy":
        navigate("/settings/privacy");
        break;
      case "notifications":
        navigate("/settings/notifications");
        break;
      case "network":
        navigate("/contact-discovery");
        break;
      case "edit":
        navigate("/profile/edit");
        break;
      case "posts":
        navigate("/feed");
        break;
      case "location":
        navigate("/settings/location");
        break;
      case "storage":
        navigate("/settings/storage");
        break;
      case "help":
        navigate("/settings/help");
        break;
      case "logout":
        signOut();
        break;
      default:
        console.log("Unhandled menu action:", action);
    }
  };

  // Create menu sections with real data
  const menuSections = [
    {
      title: "Account",
      items: [
        { icon: Users, label: "My Network", sublabel: "Connect with event professionals", action: "network" },
        { icon: FileText, label: "My Posts", sublabel: "View your feed posts", action: "posts" },
        { icon: MapPin, label: "Location", sublabel: profile?.location || "Not set", action: "location" }
      ]
    },
    {
      title: "Settings",
      items: [
        { icon: Bell, label: "Notifications", sublabel: "Messages, updates", action: "notifications" },
        { icon: Shield, label: "Privacy", sublabel: "Block contacts, security", action: "privacy" },
        { icon: HardDrive, label: "Storage", sublabel: "Data usage settings", action: "storage" }
      ]
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help", sublabel: "FAQ, contact us", action: "help" },
        { icon: LogOut, label: "Log Out", sublabel: "", action: "logout", isDestructive: true }
      ]
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
        <header className="p-3 border-b border-border">
          <h1 className="text-lg font-bold">Profile</h1>
        </header>
        <Loading className="p-8" text="Loading profile..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
        <header className="p-3 border-b border-border">
          <h1 className="text-lg font-bold">Profile</h1>
        </header>
        <div className="flex flex-col items-center justify-center p-8">
          <h3 className="font-medium text-foreground mb-2">Profile not found</h3>
          <p className="text-sm text-muted-foreground mb-4">Please complete your profile setup</p>
          <Button onClick={() => navigate("/profile/edit")}>Set up Profile</Button>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      {/* Header */}
      <header className="p-3 border-b border-border">
        <h1 className="text-lg font-bold">Profile</h1>
      </header>

      {/* Profile Header */}
      <div className="p-4 bg-card">
        <div className="flex items-center space-x-3">
          {/* Avatar with Camera Button */}
          <div className="relative flex-shrink-0">
            {profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={profile.full_name || 'Profile'} 
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-lg font-bold">
                {getInitials(profile.full_name || 'User')}
              </div>
            )}
            <Button
              size="icon"
              variant="secondary"
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full"
              onClick={() => handleMenuAction("edit")}
            >
              <Camera className="h-2.5 w-2.5" />
            </Button>
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate">{profile.full_name || 'Unknown User'}</h2>
            <p className="text-primary font-medium text-xs truncate">{profile.user_type || 'User'}</p>
            <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{profile.bio || 'No bio available'}</p>
          </div>

          {/* Edit Button */}
          <Button variant="ghost" size="icon" onClick={() => handleMenuAction("edit")} className="flex-shrink-0 h-8 w-8">
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="mt-3">
        {menuSections.map((section, sectionIndex) => (
          <div key={section.title}>
            {/* Section Title */}
            <div className="px-4 py-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {section.title}
              </h3>
            </div>

            {/* Menu Items */}
            <div className="bg-card">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                
                return (
                  <div key={item.label}>
                    <button
                      onClick={() => handleMenuAction(item.action)}
                      className="w-full flex items-center p-3 hover:bg-accent transition-colors"
                    >
                      <Icon 
                        className={`h-4 w-4 mr-3 flex-shrink-0 ${
                          item.isDestructive ? "text-destructive" : "text-muted-foreground"
                        }`} 
                      />
                      <div className="flex-1 text-left min-w-0">
                        <div 
                          className={`font-medium truncate text-sm ${
                            item.isDestructive ? "text-destructive" : "text-foreground"
                          }`}
                        >
                          {item.label}
                        </div>
                        {item.sublabel && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {item.sublabel}
                          </div>
                        )}
                      </div>
                      {!item.isDestructive && (
                        <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>
                    
                    {itemIndex < section.items.length - 1 && (
                      <div className="mx-3">
                        <Separator className="ml-7" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {sectionIndex < menuSections.length - 1 && (
              <div className="h-3" />
            )}
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-3 mt-4">
        <div className="flex flex-wrap items-center text-xs text-muted-foreground gap-3">
          <div className="flex items-center min-w-0">
            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{profile.location || 'Location not set'}</span>
          </div>
          <div className="flex items-center min-w-0">
            <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">
              Joined {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              }) : 'Unknown'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}