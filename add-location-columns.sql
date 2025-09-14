-- Add missing location-related columns to profiles table
-- This script adds the columns needed for location functionality

-- Add location-related columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS location_sharing_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS location_visibility VARCHAR(20) DEFAULT 'private' CHECK (location_visibility IN ('public', 'contacts', 'private')),
ADD COLUMN IF NOT EXISTS show_distance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS event_location_sharing BOOLEAN DEFAULT false;

-- Create index for location queries
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create index for location sharing
CREATE INDEX IF NOT EXISTS idx_profiles_location_sharing ON public.profiles(location_sharing_enabled, location_visibility) WHERE location_sharing_enabled = true;

-- Success message
SELECT 'Location columns added successfully!' as status;
