import { supabase } from '@/integrations/supabase/client';

export const createTestUser = async () => {
  const testEmail = 'test@example.com';
  const testPassword = 'testpassword123';
  
  try {
    // First, try to sign up a test user
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User',
          user_type: 'event_planner'
        }
      }
    });

    if (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    }

    console.log('Test user created:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

export const testSignIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }

    console.log('Sign in successful:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return { success: false, error: error.message };
  }
};
