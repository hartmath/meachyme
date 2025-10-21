-- Add 1-arg wrapper helpers so calls like is_group_admin(group_id) resolve
-- Some environments don't resolve defaulted parameters in RLS expressions

set check_function_bodies = off;

-- One-arg wrapper for is_group_admin
CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_group_admin(p_group_id, auth.uid());
$$;

-- One-arg wrapper for is_group_creator
CREATE OR REPLACE FUNCTION public.is_group_creator(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_group_creator(p_group_id, auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_creator(uuid) TO anon, authenticated;






