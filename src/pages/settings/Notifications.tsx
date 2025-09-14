import { ArrowLeft, Bell, BellOff, MessageCircle, Heart, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Notifications() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    pushNotifications: true,
    messageNotifications: true,
    groupNotifications: true,
    likeNotifications: true,
    commentNotifications: true,
    eventNotifications: true,
    soundEnabled: true,
    vibrationEnabled: true
  });

  const updateSetting = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="flex items-center p-3 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/profile")}
          className="mr-2 h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">Notifications</h1>
      </header>

      {/* Notification Settings */}
      <div className="p-3 space-y-4">
        {/* General */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">General</h3>
          
          <div className="flex items-center justify-between p-3 bg-card rounded-lg">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground text-sm">Push Notifications</p>
                <p className="text-xs text-muted-foreground">Enable all push notifications</p>
              </div>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onCheckedChange={(checked) => updateSetting("pushNotifications", checked)}
            />
          </div>
        </div>

        {/* Message Notifications */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Messages</h3>
          
          <div className="flex items-center justify-between p-3 bg-card rounded-lg">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground text-sm">New Messages</p>
                <p className="text-xs text-muted-foreground">Get notified of new direct messages</p>
              </div>
            </div>
            <Switch
              checked={settings.messageNotifications}
              onCheckedChange={(checked) => updateSetting("messageNotifications", checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-card rounded-lg">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground text-sm">Group Messages</p>
                <p className="text-xs text-muted-foreground">Get notified of group chat messages</p>
              </div>
            </div>
            <Switch
              checked={settings.groupNotifications}
              onCheckedChange={(checked) => updateSetting("groupNotifications", checked)}
            />
          </div>
        </div>

        {/* Social Notifications */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Social</h3>
          
          <div className="flex items-center justify-between p-3 bg-card rounded-lg">
            <div className="flex items-center space-x-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground text-sm">Likes</p>
                <p className="text-xs text-muted-foreground">When someone likes your status</p>
              </div>
            </div>
            <Switch
              checked={settings.likeNotifications}
              onCheckedChange={(checked) => updateSetting("likeNotifications", checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-card rounded-lg">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground text-sm">Comments</p>
                <p className="text-xs text-muted-foreground">When someone comments on your posts</p>
              </div>
            </div>
            <Switch
              checked={settings.commentNotifications}
              onCheckedChange={(checked) => updateSetting("commentNotifications", checked)}
            />
          </div>
        </div>

        {/* Event Notifications */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Events</h3>
          
          <div className="flex items-center justify-between p-3 bg-card rounded-lg">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground text-sm">Event Updates</p>
                <p className="text-xs text-muted-foreground">Important event announcements</p>
              </div>
            </div>
            <Switch
              checked={settings.eventNotifications}
              onCheckedChange={(checked) => updateSetting("eventNotifications", checked)}
            />
          </div>
        </div>

        {/* Sound & Vibration */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Sound & Vibration</h3>
          
          <div className="flex items-center justify-between p-3 bg-card rounded-lg">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground text-sm">Sound</p>
                <p className="text-xs text-muted-foreground">Play sound for notifications</p>
              </div>
            </div>
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => updateSetting("soundEnabled", checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-card rounded-lg">
            <div className="flex items-center space-x-2">
              <BellOff className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground text-sm">Vibration</p>
                <p className="text-xs text-muted-foreground">Vibrate for notifications</p>
              </div>
            </div>
            <Switch
              checked={settings.vibrationEnabled}
              onCheckedChange={(checked) => updateSetting("vibrationEnabled", checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}