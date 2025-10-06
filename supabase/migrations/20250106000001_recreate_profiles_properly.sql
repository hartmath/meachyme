-- =====================================================
-- COMPREHENSIVE DATABASE FIX FOR CHYME APP
-- This migration recreates the profiles table with proper structure
-- and ensures all related tables and policies work correctly
-- =====================================================

-- Step 1: Drop existing problematic constraints and policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Recreate profiles table with correct structure
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  -- Primary key is the user ID from auth.users
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- User information
  full_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  bio TEXT,
  location TEXT,
  
  -- User type and role
  user_type TEXT DEFAULT 'attendee' CHECK (user_type IN ('attendee', 'organizer', 'vendor', 'sponsor')),
  
  -- Profile media
  avatar_url TEXT,
  cover_url TEXT,
  
  -- Status and settings
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ,
  onboarding_completed BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT profiles_id_unique UNIQUE (id)
);

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_user_type_idx ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS profiles_full_name_idx ON public.profiles(full_name);
CREATE INDEX IF NOT EXISTS profiles_is_online_idx ON public.profiles(is_online);

-- Step 4: Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS Policies
-- Everyone can view profiles (for public profile browsing)
CREATE POLICY "profiles_select_policy"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Users can insert their own profile
CREATE POLICY "profiles_insert_policy"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_policy"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can delete their own profile (optional, usually handled by CASCADE)
CREATE POLICY "profiles_delete_policy"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = id);

-- Step 6: Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    user_type,
    avatar_url,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'attendee'),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, update it instead
    UPDATE public.profiles
    SET
      email = NEW.email,
      full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
      updated_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create trigger to run function on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 8: Ensure all existing auth users have profiles
INSERT INTO public.profiles (id, email, full_name, user_type, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as full_name,
  COALESCE(au.raw_user_meta_data->>'user_type', 'attendee') as user_type,
  NOW(),
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- Step 9: Create profiles for users in messages who don't have profiles
-- This ensures chat functionality works for existing messages
INSERT INTO public.profiles (id, email, full_name, user_type, created_at, updated_at)
SELECT DISTINCT
  user_id,
  'user_' || user_id || '@placeholder.local' as email,
  'User ' || substring(user_id::text, 1, 8) as full_name,
  'attendee' as user_type,
  NOW(),
  NOW()
FROM (
  SELECT sender_id as user_id FROM public.direct_messages
  UNION
  SELECT recipient_id as user_id FROM public.direct_messages
) message_users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = message_users.user_id
)
ON CONFLICT (id) DO NOTHING;

-- Step 10: Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 12: Grant necessary permissions
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT DELETE ON public.profiles TO authenticated;

-- Step 13: Create helper function to ensure profile exists
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id UUID)
RETURNS public.profiles AS $$
DECLARE
  profile_record public.profiles;
BEGIN
  -- Try to get existing profile
  SELECT * INTO profile_record FROM public.profiles WHERE id = user_id;
  
  -- If not found, create one
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, full_name, user_type, created_at, updated_at)
    VALUES (
      user_id,
      'User ' || substring(user_id::text, 1, 8),
      'attendee',
      NOW(),
      NOW()
    )
    RETURNING * INTO profile_record;
  END IF;
  
  RETURN profile_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICATION QUERIES (Run these manually to verify)
-- =====================================================

-- Check total profiles
-- SELECT COUNT(*) as total_profiles FROM public.profiles;

-- Check profiles without email
-- SELECT * FROM public.profiles WHERE email IS NULL;

-- Check users without profiles
-- SELECT au.id, au.email 
-- FROM auth.users au 
-- LEFT JOIN public.profiles p ON au.id = p.id 
-- WHERE p.id IS NULL;

-- Check message participants without profiles
-- SELECT DISTINCT user_id 
-- FROM (
--   SELECT sender_id as user_id FROM public.direct_messages
--   UNION
--   SELECT recipient_id as user_id FROM public.direct_messages
-- ) message_users
-- LEFT JOIN public.profiles p ON message_users.user_id = p.id
-- WHERE p.id IS NULL;

COMMENT ON TABLE public.profiles IS 'User profiles with automatic creation on signup';
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates profile when user signs up';
COMMENT ON FUNCTION public.ensure_user_profile(UUID) IS 'Ensures a profile exists for a user ID, creates if missing';
