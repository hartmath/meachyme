# Push Notifications Setup Guide

## ✅ What's Already Implemented

1. **Push notification hook** - Automatically requests permissions and registers for notifications
2. **Notification triggers** - Sends notifications when:
   - Direct messages are sent
   - Group messages are sent
   - Calls are initiated (ready for implementation)
3. **Supabase Edge Function** - Handles sending notifications via Expo Push API
4. **Notification settings UI** - Users can control notification preferences

## 🔧 Setup Required

### 1. Get Expo Access Token

1. Go to [Expo Developer Console](https://expo.dev/accounts/[your-username]/settings/access-tokens)
2. Create a new access token with push notification permissions
3. Copy the token

### 2. Configure Supabase Environment

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions**
3. Add the environment variable:
   ```
   EXPO_ACCESS_TOKEN=your_expo_access_token_here
   ```

### 3. Deploy Edge Function (if not already deployed)

```bash
# Deploy the push notification function
npx supabase functions deploy send-push-notification
```

## 📱 How It Works

### For Direct Messages:
- When a user sends a message, the app automatically sends a push notification to the recipient
- Notification includes sender name and message preview
- Tapping the notification opens the chat

### For Group Messages:
- When a user sends a group message, notifications are sent to all other group members
- Notification includes sender name, group name, and message preview
- Tapping the notification opens the group chat

### For Calls (Ready to implement):
- When a call is initiated, notifications are sent to the recipient(s)
- Includes call type (voice/video) and caller information

## 🧪 Testing

1. **Web Testing**: Push notifications work in web browsers that support them
2. **Mobile Testing**: For full functionality, test on actual mobile devices
3. **Check Console**: Look for "Push registration success" messages in browser console

## 🔍 Troubleshooting

### Common Issues:

1. **"EXPO_ACCESS_TOKEN not configured"**
   - Make sure the environment variable is set in Supabase Edge Functions

2. **"Push notification permission denied"**
   - User needs to grant notification permissions in their browser/device

3. **Notifications not received**
   - Check if the user has a valid push token stored in their profile
   - Verify the Expo access token has correct permissions

### Debug Steps:

1. Check browser console for push registration messages
2. Verify push tokens are being stored in the `profiles` table
3. Test the Edge Function directly with a curl request
4. Check Supabase Edge Function logs for errors

## 📊 Database Schema

The push notification system uses the existing `profiles` table with a `settings` JSON field:

```json
{
  "push_token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "web" // or "ios", "android"
}
```

## 🚀 Next Steps

1. Set up the EXPO_ACCESS_TOKEN
2. Deploy the Edge Function
3. Test with real devices
4. Consider adding notification preferences per user
5. Implement call notifications when ready
