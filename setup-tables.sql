-- First, create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  user_type TEXT CHECK (user_type IN ('organizer', 'vendor', 'venue_owner', 'attendee')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles 
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Create indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);

-- Create trigger for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to create profile after user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, user_type)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'user_type'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Drop existing shared_event_links table if it exists
DROP TABLE IF EXISTS public.shared_event_links CASCADE;

-- Then create the shared_event_links table
CREATE TABLE public.shared_event_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_link TEXT,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'shared_link' CHECK (event_type IN ('shared_link', 'created_event')),
  event_date TIMESTAMP WITH TIME ZONE,
  event_location TEXT,
  event_category TEXT,
  max_attendees INTEGER,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Enable RLS for shared_event_links
ALTER TABLE public.shared_event_links ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for shared_event_links
DROP POLICY IF EXISTS "Users can view all shared event links" ON public.shared_event_links;
DROP POLICY IF EXISTS "Users can create their own event links" ON public.shared_event_links;
DROP POLICY IF EXISTS "Users can update their own event links" ON public.shared_event_links;
DROP POLICY IF EXISTS "Users can delete their own event links" ON public.shared_event_links;

CREATE POLICY "Users can view all shared event links" ON public.shared_event_links FOR SELECT USING (true);
CREATE POLICY "Users can create their own event links" ON public.shared_event_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own event links" ON public.shared_event_links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own event links" ON public.shared_event_links FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for shared_event_links
CREATE INDEX IF NOT EXISTS idx_shared_event_links_user_id ON public.shared_event_links(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_event_links_created_at ON public.shared_event_links(created_at DESC);

-- Create trigger for shared_event_links updated_at
DROP TRIGGER IF EXISTS update_shared_event_links_updated_at ON public.shared_event_links;
CREATE TRIGGER update_shared_event_links_updated_at 
  BEFORE UPDATE ON public.shared_event_links 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();