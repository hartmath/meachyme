import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
// import { ensureUserProfile } from '@/utils/createProfile';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  needsOnboarding: boolean;
  signUp: (email: string, password: string, userData?: { full_name?: string; user_type?: string }) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const { toast } = useToast();

  // Initialize and check persisted state
  useEffect(() => {
    const initializeState = async () => {
      try {
        // Check for existing session first
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          setSession(existingSession);
          setUser(existingSession.user);
          
          // Check onboarding status
          try {
            const onboardingCompleted = localStorage.getItem("onboarding_completed");
            if (!onboardingCompleted) {
              setNeedsOnboarding(true);
            }
          } catch (error) {
            console.warn('Could not check onboarding status:', error);
          }
        }
      } catch (error) {
        console.error('Error initializing auth state:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeState();
  }, []); // Close first useEffect

  useEffect(() => {
    // Set up auth state listener FIRST
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          try {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            // Handle auth events
            if (event === 'SIGNED_IN') {
              // Ensure user has a profile (temporarily disabled)
              // if (session?.user) {
              //   ensureUserProfile().catch(error => {
              //     console.warn('Failed to ensure user profile:', error);
              //   });
              // }
              
              // Check if user needs onboarding
              const onboardingCompleted = localStorage.getItem("onboarding_completed");
              const isNewUser = localStorage.getItem("is_new_user") === "true";
              
              if (isNewUser && !onboardingCompleted) {
                setNeedsOnboarding(true);
              } else {
                setNeedsOnboarding(false);
              }
              
              // Clear the new user flag after checking
              localStorage.removeItem("is_new_user");
              
              // Only show welcome message if this is a fresh sign-in (not a page refresh)
              const hasShownWelcome = sessionStorage.getItem("welcome_shown");
              if (!hasShownWelcome) {
                toast({
                  title: "Welcome back!",
                  description: "You have been signed in successfully.",
                });
                sessionStorage.setItem("welcome_shown", "true");
              }
            } else if (event === 'SIGNED_OUT') {
              setNeedsOnboarding(false);
              // Clear onboarding status on logout
              localStorage.removeItem("onboarding_completed");
              // Clear welcome flag so it can show again on next login
              sessionStorage.removeItem("welcome_shown");
              toast({
                title: "Signed out",
                description: "You have been signed out successfully.",
              });
            } else if (event === 'USER_UPDATED') {
              toast({
                title: "Profile updated",
                description: "Your profile has been updated.",
              });
            }
          } catch (error) {
            console.error('Error in auth state change:', error);
            setLoading(false);
          }
        }
      );

      // THEN check for existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session) {
          // Check if existing user needs onboarding
          const onboardingCompleted = localStorage.getItem("onboarding_completed");
          if (!onboardingCompleted) {
            setNeedsOnboarding(true);
          }
        }
        
        setLoading(false);
      }).catch((error) => {
        console.error('Error getting session:', error);
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('Error setting up auth listener:', error);
      setLoading(false);
    }
  }, [toast]);

  const signUp = async (email: string, password: string, userData?: { full_name?: string; user_type?: string }) => {
    try {
      setLoading(true);
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: userData
        }
      });

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

      // Mark as new user for onboarding
      localStorage.setItem("is_new_user", "true");
      
      toast({
        title: "Check your email",
        description: "We've sent you a confirmation link to complete your registration.",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive"
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let message = error.message;
        if (error.message.includes('Invalid login credentials')) {
          message = "Invalid email or password. Please check your credentials and try again.";
        } else if (error.message.includes('Email not confirmed')) {
          message = "Please check your email and click the confirmation link before signing in.";
        }
        
        toast({
          title: "Sign in failed",
          description: message,
          variant: "destructive"
        });
        return { error };
      }

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive"
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Sign out failed",
          description: error.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem("onboarding_completed", "true");
    setNeedsOnboarding(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      needsOnboarding,
      signUp,
      signIn,
      signOut,
      completeOnboarding,
    }}>
      {children}
    </AuthContext.Provider>
  );
}