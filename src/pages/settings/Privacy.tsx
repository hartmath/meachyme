import { ArrowLeft, Shield, Eye, EyeOff, Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Privacy() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    profileVisibility: true,
    lastSeen: true,
    readReceipts: true,
    statusVisibility: true,
    contactSync: false
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
        <h1 className="text-lg font-semibold">Privacy</h1>
      </header>

      {/* Privacy Settings */}
      <div className="p-3 space-y-4">
        {/* Profile Visibility */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Profile Visibility</h3>
          
          <div className="flex items-center justify-between p-3 bg-card rounded-lg">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground text-sm">Public Profile</p>
                <p className="text-xs text-muted-foreground">Anyone can see your profile</p>
              </div>
            </div>
            <Switch
              checked={settings.profileVisibility}
              onCheckedChange={(checked) => updateSetting("profileVisibility", checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-card rounded-lg">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground text-sm">Last Seen</p>
                <p className="text-xs text-muted-foreground">Show when you were last online</p>
              </div>
            </div>
            <Switch
              checked={settings.lastSeen}
              onCheckedChange={(checked) => updateSetting("lastSeen", checked)}
            />
          </div>
        </div>

        {/* Messaging Privacy */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Messaging</h3>
          
          <div className="flex items-center justify-between p-3 bg-card rounded-lg">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground text-sm">Read Receipts</p>
                <p className="text-xs text-muted-foreground">Show when you've read messages</p>
              </div>
            </div>
            <Switch
              checked={settings.readReceipts}
              onCheckedChange={(checked) => updateSetting("readReceipts", checked)}
            />
          </div>
        </div>

        {/* Status Privacy */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Status Updates</h3>
          
          <div className="flex items-center justify-between p-3 bg-card rounded-lg">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground text-sm">Status Visibility</p>
                <p className="text-xs text-muted-foreground">Who can see your status updates</p>
              </div>
            </div>
            <Switch
              checked={settings.statusVisibility}
              onCheckedChange={(checked) => updateSetting("statusVisibility", checked)}
            />
          </div>
        </div>

        {/* Data & Contacts */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Data & Contacts</h3>
          
          <div className="flex items-center justify-between p-3 bg-card rounded-lg">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground text-sm">Contact Sync</p>
                <p className="text-xs text-muted-foreground">Sync phone contacts to find friends</p>
              </div>
            </div>
            <Switch
              checked={settings.contactSync}
              onCheckedChange={(checked) => updateSetting("contactSync", checked)}
            />
          </div>
        </div>

        {/* Blocked Contacts */}
        <div className="p-3 bg-card rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <EyeOff className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground text-sm">Blocked Contacts</p>
                <p className="text-xs text-muted-foreground">Manage blocked users</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              Manage
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}