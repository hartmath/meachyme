# 🌐 Chyme Website Test Checklist

## ✅ **Core Functionality Tests**

### **🔐 Authentication & Onboarding**
- [ ] **Sign Up** - Create new account with email/password
- [ ] **Sign In** - Login with existing credentials  
- [ ] **Profile Setup** - Complete onboarding with name, bio, role, avatar
- [ ] **Auto-redirect** - Authenticated users go to /chats
- [ ] **Session persistence** - Stay logged in on refresh

### **💬 Chat Functionality**
- [ ] **Chat List** - View all conversations
- [ ] **Long Press Menu** - Pin, block, call, delete options
- [ ] **Send Messages** - Text messages work
- [ ] **Voice Messages** - Record and send voice notes
- [ ] **File Uploads** - Images and documents
- [ ] **Message Reactions** - Like/react to messages
- [ ] **Real-time Updates** - Messages appear instantly
- [ ] **Unread Badges** - Show unread message counts
- [ ] **Mark as Read** - Badges disappear when chat opened

### **📱 Navigation & UI**
- [ ] **Bottom Navigation** - All 5 tabs work (Chats, Status, Events, Calls, Profile)
- [ ] **Back Buttons** - Navigate back from detail pages
- [ ] **Search** - Find contacts and conversations
- [ ] **Theme Toggle** - Dark/light mode switching
- [ ] **Responsive Design** - Works on mobile and desktop

### **📸 Status & Media**
- [ ] **Create Status** - Post text and images
- [ ] **View Status** - See other users' status posts
- [ ] **Status Interactions** - Like, comment, share
- [ ] **Image Upload** - Status media uploads work
- [ ] **Status Expiry** - 24-hour expiration

### **👥 Groups & Contacts**
- [ ] **Create Group** - Make new group chats
- [ ] **Group Messages** - Send messages in groups
- [ ] **Group Settings** - Manage group details
- [ ] **Contact Discovery** - Find and connect with users
- [ ] **QR Code** - Share contact information

### **📞 Calls & Communication**
- [ ] **Voice Calls** - Start voice calls from chat
- [ ] **Video Calls** - Start video calls from chat
- [ ] **Call History** - View past calls
- [ ] **Call Interface** - Answer, decline, end calls

### **⚙️ Settings & Profile**
- [ ] **Profile Edit** - Update name, bio, avatar
- [ ] **Privacy Settings** - Block users, manage visibility
- [ ] **Notifications** - Configure notification preferences
- [ ] **Storage Management** - View data usage
- [ ] **Help & Support** - Access help resources

## 🔧 **Technical Tests**

### **📤 Upload Functionality**
- [ ] **Avatar Upload** - Profile pictures (5MB limit)
- [ ] **Status Media** - Images/videos (10MB limit)
- [ ] **Chat Attachments** - Files, images, voice (20MB limit)
- [ ] **File Types** - JPEG, PNG, WebP, GIF, MP4, WebM, PDF, DOC
- [ ] **Audio Files** - WAV, MP3, MPEG, OGG, WebM for voice messages

### **🗄️ Database Operations**
- [ ] **Profile Creation** - User profiles save correctly
- [ ] **Message Storage** - Messages persist in database
- [ ] **File Storage** - Uploads stored in Supabase Storage
- [ ] **Real-time Sync** - Changes sync across devices
- [ ] **Data Cleanup** - Deleted items removed properly

### **🔒 Security & Permissions**
- [ ] **RLS Policies** - Users only see their own data
- [ ] **File Access** - Private files only accessible to participants
- [ ] **Authentication** - Protected routes require login
- [ ] **Input Validation** - Malicious input blocked

## 🚨 **Known Issues to Check**

### **Fixed Issues**
- ✅ **Voice Messages** - Duration now shows correctly
- ✅ **Profile Creation** - Missing onboarding_completed field added
- ✅ **404 Routing** - Vercel/Netlify redirects configured
- ✅ **Long Press Menu** - Context menu positioning fixed
- ✅ **Badge System** - Notification badges working

### **Potential Issues to Monitor**
- ⚠️ **Storage Buckets** - Ensure all buckets exist in Supabase
- ⚠️ **RLS Policies** - Check storage access permissions
- ⚠️ **File Size Limits** - Test with large files
- ⚠️ **Network Errors** - Handle offline scenarios
- ⚠️ **Browser Compatibility** - Test on different browsers

## 📋 **Quick Test Commands**

### **Run These SQL Migrations First:**
```sql
-- Run run-migrations.sql in Supabase Dashboard
-- This creates user_preferences table and fixes profiles
```

### **Test Upload Limits:**
- Avatar: 5MB max
- Status Media: 10MB max  
- Chat Attachments: 20MB max

### **Test File Types:**
- Images: JPEG, PNG, WebP, GIF
- Videos: MP4, WebM
- Audio: WAV, MP3, MPEG, OGG, WebM
- Documents: PDF, DOC, DOCX, TXT

## 🎯 **Priority Tests**

1. **Authentication Flow** - Most critical
2. **Chat Messaging** - Core functionality
3. **File Uploads** - Common user action
4. **Voice Messages** - Recently fixed
5. **Long Press Menu** - New feature
6. **Navigation** - User experience

## 📱 **Mobile Testing**

- [ ] **Touch Interactions** - Long press, tap, swipe
- [ ] **Keyboard** - Text input works
- [ ] **Camera/Mic** - Media access permissions
- [ ] **PWA Features** - Install prompt, offline mode
- [ ] **Performance** - Smooth scrolling, fast loading

---

**Status**: ✅ Ready for Testing
**Last Updated**: January 2025
**Version**: 1.0.0
