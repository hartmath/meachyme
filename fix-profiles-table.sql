-- Add missing fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Update existing profiles to have onboarding completed
UPDATE public.profiles 
SET onboarding_completed = true 
WHERE onboarding_completed IS NULL;
