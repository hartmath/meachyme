-- Clean recreation of helper functions - completely fresh approach
-- This migration completely removes all existing functions and recreates them cleanly

-- Step 1: Drop ALL policies that depend on these functions
DROP POLICY IF EXISTS "View memberships (self/admin/creator)" ON public.group_members;
DROP POLICY IF EXISTS "Insert memberships (self/admin/creator)" ON public.group_members;
DROP POLICY IF EXISTS "Delete memberships (self/admin/creator)" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can add members" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can remove members" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can update member roles" ON public.group_members;

-- Step 2: Completely remove all existing functions using a more aggressive approach
-- First, let's see what functions exist and drop them all
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Drop all functions named is_group_admin
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as argtypes
        FROM pg_proc 
        WHERE proname IN ('is_group_admin', 'is_group_creator')
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', 
                      func_record.proname, func_record.argtypes);
    END LOOP;
END $$;

-- Step 3: Create the base two-parameter functions with clear, unique names
CREATE FUNCTION public.is_group_admin_base(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = p_user_id
      AND gm.role = 'admin'
  );
$$;

CREATE FUNCTION public.is_group_creator_base(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.id = p_group_id
      AND g.created_by = p_user_id
  );
$$;

-- Step 4: Create the convenience wrapper functions with unique names
CREATE FUNCTION public.is_group_admin_wrapper(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_group_admin_base(p_group_id, auth.uid());
$$;

CREATE FUNCTION public.is_group_creator_wrapper(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_group_creator_base(p_group_id, auth.uid());
$$;

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION public.is_group_admin_base(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_creator_base(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin_wrapper(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_creator_wrapper(uuid) TO anon, authenticated;

-- Step 6: Recreate policies using the new wrapper functions
CREATE POLICY "View memberships (self/admin/creator)"
ON public.group_members
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_group_admin_wrapper(group_id)
  OR public.is_group_creator_wrapper(group_id)
);

CREATE POLICY "Insert memberships (self/admin/creator)"
ON public.group_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR public.is_group_admin_wrapper(group_id)
  OR public.is_group_creator_wrapper(group_id)
);

CREATE POLICY "Delete memberships (self/admin/creator)"
ON public.group_members
FOR DELETE
USING (
  auth.uid() = user_id
  OR public.is_group_admin_wrapper(group_id)
  OR public.is_group_creator_wrapper(group_id)
);

CREATE POLICY "Group creators can update member roles"
ON public.group_members
FOR UPDATE
USING (
  public.is_group_creator_wrapper(group_id)
)
WITH CHECK (
  public.is_group_creator_wrapper(group_id)
);
