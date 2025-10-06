import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const createUserProfile = async (userData?: {
  full_name?: string;
  user_type?: string;
  bio?: string;
  location?: string;
  phone?: string;
}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (existingProfile) {
      return { success: true, message: 'Profile already exists', profile: existingProfile };
    }

    // Create new profile
    const { data: newProfile, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: userData?.full_name || user.email?.split('@')[0] || 'User',
        user_type: userData?.user_type || 'attendee',
        bio: userData?.bio || null,
        location: userData?.location || null,
        phone: userData?.phone || null,
        email: user.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Profile creation error:', error);
      throw error;
    }

    return { success: true, message: 'Profile created successfully', profile: newProfile };
  } catch (error: any) {
    console.error('Error creating profile:', error);
    return { success: false, error: error.message };
  }
};

export const ensureUserProfile = async () => {
  const result = await createUserProfile();
  if (!result.success) {
    console.error('Failed to ensure user profile:', result.error);
  }
  return result;
};
