-- Fix RLS policy for adding members to groups
-- This will allow admins to add members to groups

-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "new_group_members_insert_authenticated" ON public.new_group_members;

-- Create a new policy that allows admins to add members
CREATE POLICY "new_group_members_insert_admin_or_self"
ON public.new_group_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if user is adding themselves
  auth.uid() = user_id
  OR
  -- Allow if user is an admin of the group
  EXISTS (
    SELECT 1
    FROM public.new_group_members gm
    WHERE gm.group_id = new_group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
  )
);

-- Also create a policy to allow group creators to add members
CREATE POLICY "new_group_members_insert_creator"
ON public.new_group_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if user is the creator of the group
  EXISTS (
    SELECT 1
    FROM public.new_groups g
    WHERE g.id = new_group_members.group_id
      AND g.created_by = auth.uid()
  )
);

-- Grant necessary permissions
GRANT INSERT ON public.new_group_members TO authenticated;
GRANT SELECT ON public.new_group_members TO authenticated;
GRANT UPDATE ON public.new_group_members TO authenticated;
GRANT DELETE ON public.new_group_members TO authenticated;
