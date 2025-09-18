import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
import Welcome from "./pages/onboarding/Welcome";
import RoleSelection from "./pages/onboarding/RoleSelection";
import ProfileSetup from "./pages/onboarding/ProfileSetup";
import GroupChatList from "./pages/GroupChatList";
import CreateGroup from "./pages/CreateGroup";
import GroupChatDetail from "./pages/GroupChatDetail";
import GroupSettings from "./pages/GroupSettings";
import NotFound from "./pages/NotFound";
import Test from "./pages/Test";

const queryClient = new QueryClient();

function AppContent() {
  // Add error boundary for route-level errors
  const [routeError, setRouteError] = useState<Error | null>(null);

  // Reset error when route changes
  useEffect(() => {
    setRouteError(null);
  }, [window.location.pathname]);

  if (routeError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="text-muted-foreground mb-4">{routeError.message}</p>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/test" element={<Test />} />
        
        {/* Protected routes */}
        <Route path="/chats" element={
          <ProtectedRoute>
            <>
              <Chats />
              <BottomNavigation />
            </>
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

const App = () => {
  // Configure React Query for better error handling and retries
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 3,
        retryDelay: 1000,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: true
      },
      mutations: {
        retry: 3,
        retryDelay: 1000
      }
    },
  });

  return (
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
};

export default App;
