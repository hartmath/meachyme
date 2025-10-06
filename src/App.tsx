import { useState, useEffect, Suspense, lazy } from "react";
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
import { Loading } from "@/components/Loading";
import { usePerformance } from "@/hooks/usePerformance";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Chats = lazy(() => import("./pages/Chats"));
const Feed = lazy(() => import("./pages/Feed"));
const Events = lazy(() => import("./pages/Events"));
const Profile = lazy(() => import("./pages/Profile"));
const ProfileEdit = lazy(() => import("./pages/ProfileEdit"));
const ChatDetail = lazy(() => import("./pages/ChatDetail"));
const CreateStatus = lazy(() => import("./pages/CreateStatus"));
const ContactDiscovery = lazy(() => import("./pages/ContactDiscovery"));
const Privacy = lazy(() => import("./pages/settings/Privacy"));
const Notifications = lazy(() => import("./pages/settings/Notifications"));
const Help = lazy(() => import("./pages/settings/Help"));
const Location = lazy(() => import("./pages/settings/Location"));
const Welcome = lazy(() => import("./pages/onboarding/Welcome"));
const RoleSelection = lazy(() => import("./pages/onboarding/RoleSelection"));
const ProfileSetup = lazy(() => import("./pages/onboarding/ProfileSetup"));
const GroupChatList = lazy(() => import("./pages/GroupChatList"));
const CreateGroup = lazy(() => import("./pages/CreateGroup"));
const GroupChatDetail = lazy(() => import("./pages/GroupChatDetail"));
const MEAMeet = lazy(() => import("./pages/MEAMeet"));
const GroupSettings = lazy(() => import("./pages/GroupSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));

function AppContent() {
  // Add error boundary for route-level errors
  const [routeError, setRouteError] = useState<Error | null>(null);
  
  // Monitor performance
  usePerformance();

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
      <Suspense fallback={<Loading />}>
        <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        
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
        
        {/* MEA Meet routes */}
        <Route path="/meet/:meetingId" element={
          <ProtectedRoute>
            <MEAMeet />
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
      </Suspense>
    </div>
  );
}

const App = () => {
  // Configure React Query for better error handling and retries
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          // Don't retry on authentication errors
          if (error?.message?.includes('auth') || error?.message?.includes('unauthorized')) {
            return false;
          }
          return failureCount < 2;
        },
        retryDelay: 1000,
        staleTime: 5 * 60 * 1000, // 5 minutes - reduced for more frequent updates
        gcTime: 15 * 60 * 1000, // 15 minutes - reduced for better memory management
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: true, // Always refetch on mount to ensure fresh data
        networkMode: 'online', // Only run queries when online
        throwOnError: false // Don't throw errors, handle them gracefully
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
        networkMode: 'online',
        throwOnError: false
      }
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
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
