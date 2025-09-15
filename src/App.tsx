import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useWebPushNotifications } from "@/hooks/useWebPushNotifications";
import { NotificationBadgeManager } from "@/components/NotificationBadgeManager";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Chats from "./pages/Chats";
import Feed from "./pages/Feed";
import Events from "./pages/Events";
import Calls from "./pages/Calls";
import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import ChatDetail from "./pages/ChatDetail";
import Call from "./pages/Call";
import CreateStatus from "./pages/CreateStatus";
import ContactDiscovery from "./pages/ContactDiscovery";
import Privacy from "./pages/settings/Privacy";
import Notifications from "./pages/settings/Notifications";
import Help from "./pages/settings/Help";
import Location from "./pages/settings/Location";
import Storage from "./pages/settings/Storage";
import WebRTCTest from "./pages/WebRTCTest";
import Welcome from "./pages/onboarding/Welcome";
import RoleSelection from "./pages/onboarding/RoleSelection";
import ProfileSetup from "./pages/onboarding/ProfileSetup";
import GroupChatList from "./pages/GroupChatList";
import CreateGroup from "./pages/CreateGroup";
import GroupChatDetail from "./pages/GroupChatDetail";
import GroupSettings from "./pages/GroupSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  // Initialize web push notifications
  useWebPushNotifications();
  
  return (
    <div className="min-h-screen bg-background">
      <NotificationBadgeManager />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        
        {/* Protected routes */}
        <Route path="/chats" element={
          <ProtectedRoute>
            <Chats />
            <BottomNavigation />
          </ProtectedRoute>
        } />
        <Route path="/chat/:id" element={
          <ProtectedRoute>
            <ChatDetail />
          </ProtectedRoute>
        } />
        <Route path="/feed" element={
          <ProtectedRoute>
            <Feed />
            <BottomNavigation />
          </ProtectedRoute>
        } />
        <Route path="/events" element={
          <ProtectedRoute>
            <Events />
            <BottomNavigation />
          </ProtectedRoute>
        } />
        <Route path="/calls" element={
          <ProtectedRoute>
            <Calls />
            <BottomNavigation />
          </ProtectedRoute>
        } />
        <Route path="/call/:id" element={
          <ProtectedRoute>
            <Call />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
            <BottomNavigation />
          </ProtectedRoute>
        } />
        <Route path="/profile/edit" element={
          <ProtectedRoute>
            <ProfileEdit />
          </ProtectedRoute>
        } />
        <Route path="/contact-discovery" element={
          <ProtectedRoute>
            <ContactDiscovery />
          </ProtectedRoute>
        } />
        <Route path="/groups" element={
          <ProtectedRoute>
            <GroupChatList />
          </ProtectedRoute>
        } />
        <Route path="/create-group" element={
          <ProtectedRoute>
            <CreateGroup />
          </ProtectedRoute>
        } />
        <Route path="/chat/group/:id" element={
          <ProtectedRoute>
            <GroupChatDetail />
          </ProtectedRoute>
        } />
        <Route path="/group/:id/settings" element={
          <ProtectedRoute>
            <GroupSettings />
          </ProtectedRoute>
        } />
        <Route path="/create-status" element={
          <ProtectedRoute>
            <CreateStatus />
          </ProtectedRoute>
        } />
        
        {/* Settings routes */}
        <Route path="/settings/notifications" element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        } />
        <Route path="/settings/privacy" element={
          <ProtectedRoute>
            <Privacy />
          </ProtectedRoute>
        } />
        <Route path="/settings/help" element={
          <ProtectedRoute>
            <Help />
          </ProtectedRoute>
        } />
        <Route path="/settings/location" element={
          <ProtectedRoute>
            <Location />
          </ProtectedRoute>
        } />
        <Route path="/settings/storage" element={
          <ProtectedRoute>
            <Storage />
          </ProtectedRoute>
        } />
        <Route path="/webrtc-test" element={
          <ProtectedRoute>
            <WebRTCTest />
          </ProtectedRoute>
        } />
        
        {/* Onboarding routes */}
        <Route path="/onboarding/welcome" element={
          <ProtectedRoute>
            <Welcome />
          </ProtectedRoute>
        } />
        <Route path="/onboarding/role-selection" element={
          <ProtectedRoute>
            <RoleSelection />
          </ProtectedRoute>
        } />
        <Route path="/onboarding/profile-setup" element={
          <ProtectedRoute>
            <ProfileSetup />
          </ProtectedRoute>
        } />
        
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
