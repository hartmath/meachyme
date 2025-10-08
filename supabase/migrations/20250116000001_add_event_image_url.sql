-- Add image_url column to shared_event_links and refresh the view

ALTER TABLE public.shared_event_links
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Recreate the view to include the new column (select * already includes, but ensure order)
DROP VIEW IF EXISTS public.event_links_with_profiles;

CREATE VIEW public.event_links_with_profiles AS
SELECT 
  sel.*,
  p.full_name,
  p.avatar_url,
  p.user_type,
  p.location as profile_location,
  json_build_object(
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'user_type', p.user_type,
    'location', p.location
  ) as profile_data
FROM public.shared_event_links sel
LEFT JOIN public.profiles p ON sel.user_id = p.id
ORDER BY sel.created_at DESC;

ALTER VIEW public.event_links_with_profiles SET (security_invoker = true);


