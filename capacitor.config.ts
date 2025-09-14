import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.68654599f6e1453f8676dc9defc691b9',
  appName: 'collab-event-space',
  webDir: 'dist',
  server: {
    url: 'https://68654599-f6e1-453f-8676-dc9defc691b9.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;