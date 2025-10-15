-- Fix RLS policies for group_members table to allow admins to add members

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;

-- Create a new policy that allows:
-- 1. Users to join groups themselves
-- 2. Group admins to add members to their groups
CREATE POLICY "Users can join groups or admins can add members" 
ON public.group_members 
FOR INSERT 
WITH CHECK (
    -- Users can join groups themselves
    auth.uid() = user_id
    OR
    -- Group admins can add members to their groups
    auth.uid() IN (
        SELECT user_id 
        FROM public.group_members 
        WHERE group_id = group_members.group_id 
        AND role = 'admin'
    )
    OR
    -- Group creators can add members to their groups
    auth.uid() IN (
        SELECT created_by 
        FROM public.groups 
        WHERE id = group_members.group_id
    )
);

-- Also add a policy to allow group admins to view all members of their groups
CREATE POLICY "Group admins can view all members" 
ON public.group_members 
FOR SELECT 
USING (
    -- Users can view their own memberships
    auth.uid() = user_id
    OR
    -- Group admins can view all members of their groups
    auth.uid() IN (
        SELECT user_id 
        FROM public.group_members gm 
        WHERE gm.group_id = group_members.group_id 
        AND gm.role = 'admin'
    )
    OR
    -- Group creators can view all members of their groups
    auth.uid() IN (
        SELECT created_by 
        FROM public.groups 
        WHERE id = group_members.group_id
    )
);

-- Add policy to allow group admins to remove members
CREATE POLICY "Group admins can remove members" 
ON public.group_members 
FOR DELETE 
USING (
    -- Users can leave groups themselves
    auth.uid() = user_id
    OR
    -- Group admins can remove members from their groups
    auth.uid() IN (
        SELECT user_id 
        FROM public.group_members gm 
        WHERE gm.group_id = group_members.group_id 
        AND gm.role = 'admin'
    )
    OR
    -- Group creators can remove members from their groups
    auth.uid() IN (
        SELECT created_by 
        FROM public.groups 
        WHERE id = group_members.group_id
    )
);
