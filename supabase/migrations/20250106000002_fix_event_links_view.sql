-- Fix the event_links_with_profiles view to use correct profile join
-- The view was joining on profiles.user_id but should join on profiles.id

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
LEFT JOIN public.profiles p ON sel.user_id = p.id  -- Fixed: use p.id instead of p.user_id
ORDER BY sel.created_at DESC;

-- Enable RLS for the view
ALTER VIEW public.event_links_with_profiles SET (security_invoker = true);

COMMENT ON VIEW public.event_links_with_profiles IS 'Event links joined with profile data - fixed to use profiles.id';
