-- Fix infinite recursion in RLS for group_members by using SECURITY DEFINER helpers
-- and replacing policies that referenced group_members inside themselves.

-- Helper: ensure functions run in public schema with elevated rights
set check_function_bodies = off;

-- Drop previous policies to avoid conflicts
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups or admins can add members" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can view all members" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can remove members" ON public.group_members;

-- Create helper function to check if a user is admin of a group (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id uuid, p_user_id uuid DEFAULT auth.uid())
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

-- Create helper to check if a user is creator of a group
CREATE OR REPLACE FUNCTION public.is_group_creator(p_group_id uuid, p_user_id uuid DEFAULT auth.uid())
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

-- Grant execute to anon/authenticated
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_creator(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_creator(uuid) TO anon, authenticated;

-- Recreate RLS policies without recursive SELECTs on group_members

-- SELECT: user can view own membership, admins and creators can view all members in their groups
CREATE POLICY "View memberships (self/admin/creator)"
ON public.group_members
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_group_admin(group_id)
  OR public.is_group_creator(group_id)
);

-- INSERT: user can join self, admins/creators can add others
CREATE POLICY "Insert memberships (self/admin/creator)"
ON public.group_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR public.is_group_admin(group_id)
  OR public.is_group_creator(group_id)
);

-- DELETE: user can leave, admins/creators can remove others
CREATE POLICY "Delete memberships (self/admin/creator)"
ON public.group_members
FOR DELETE
USING (
  auth.uid() = user_id
  OR public.is_group_admin(group_id)
  OR public.is_group_creator(group_id)
);


