-- SQL to set up EXPO_ACCESS_TOKEN for push notifications
-- Run this in your Supabase SQL Editor

-- First, let's check if we can access the environment variables table
-- (This might not work directly, but it's worth trying)
SELECT * FROM pg_settings WHERE name LIKE '%expo%';

-- Alternative approach: Create a configuration table to store the token
-- This is a workaround since we can't directly set environment variables via SQL

-- Create a configuration table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.app_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert the EXPO_ACCESS_TOKEN
INSERT INTO public.app_config (key, value) 
VALUES ('EXPO_ACCESS_TOKEN', 'gBUtm6W-7dsbK-oyFyB8_h47gYbxPBVlJw9PhV0t')
ON CONFLICT (key) 
DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = now();

-- Enable RLS on the config table
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read config
CREATE POLICY "Allow authenticated users to read config" 
ON public.app_config 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create policy to allow service role to manage config
CREATE POLICY "Allow service role to manage config" 
ON public.app_config 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create a function to get the EXPO token
CREATE OR REPLACE FUNCTION public.get_expo_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    token_value TEXT;
BEGIN
    SELECT value INTO token_value 
    FROM public.app_config 
    WHERE key = 'EXPO_ACCESS_TOKEN';
    
    RETURN token_value;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_expo_token() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_expo_token() TO service_role;

-- Verify the setup
SELECT 'EXPO_ACCESS_TOKEN configured successfully' as status, get_expo_token() as token;
