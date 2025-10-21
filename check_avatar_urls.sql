-- Check what avatar URLs exist in the profiles table
SELECT 
  id,
  full_name,
  avatar_url,
  user_type,
  created_at
FROM public.profiles 
ORDER BY created_at DESC
LIMIT 10;
