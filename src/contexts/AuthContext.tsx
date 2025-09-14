import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle auth events
        if (event === 'SIGNED_IN') {
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
          
          toast({
            title: "Welcome back!",
            description: "You have been signed in successfully.",
          });
        } else if (event === 'SIGNED_OUT') {
          setNeedsOnboarding(false);
          // Clear onboarding status on logout
          localStorage.removeItem("onboarding_completed");
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
    });

    return () => subscription.unsubscribe();
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}