-- Final comprehensive fix for group member addition issues
-- This migration addresses all the problems with adding members to groups

-- Step 1: Completely clean up all existing policies and functions
-- Disable RLS temporarily for cleanup
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies for groups table
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'groups' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.groups', pol.policyname);
    END LOOP;
    
    -- Drop all policies for group_members table
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'group_members' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.group_members', pol.policyname);
    END LOOP;
    
    -- Drop all policies for group_messages table
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'group_messages' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.group_messages', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL existing helper functions
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Drop all functions named is_group_creator, is_group_member, is_group_admin
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as argtypes
        FROM pg_proc 
        WHERE proname IN ('is_group_creator', 'is_group_member', 'is_group_admin', 'test_add_member')
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', 
                      func_record.proname, func_record.argtypes);
    END LOOP;
END $$;

-- Step 2: Create robust, simple helper functions
CREATE OR REPLACE FUNCTION public.is_group_creator(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.id = p_group_id
      AND g.created_by = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
  );
$$;

-- Step 3: Grant permissions for helper functions
GRANT EXECUTE ON FUNCTION public.is_group_creator(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid) TO anon, authenticated;

-- Step 4: Re-enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Step 5: Create comprehensive RLS policies for groups table
CREATE POLICY "groups_select_policy"
ON public.groups
FOR SELECT
USING (
  -- Users can see groups they created
  auth.uid() = created_by
  OR 
  -- Users can see groups they are members of
  EXISTS (
    SELECT 1 
    FROM public.group_members gm 
    WHERE gm.group_id = groups.id 
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "groups_insert_policy"
ON public.groups
FOR INSERT
WITH CHECK (
  -- Only authenticated users can create groups
  auth.uid() IS NOT NULL
  AND auth.uid() = created_by
);

CREATE POLICY "groups_update_policy"
ON public.groups
FOR UPDATE
USING (
  -- Only group creators can update groups
  auth.uid() = created_by
)
WITH CHECK (
  -- Ensure creator remains the same
  auth.uid() = created_by
);

CREATE POLICY "groups_delete_policy"
ON public.groups
FOR DELETE
USING (
  -- Only group creators can delete groups
  auth.uid() = created_by
);

-- Step 6: Create comprehensive RLS policies for group_members table
CREATE POLICY "group_members_select_policy"
ON public.group_members
FOR SELECT
USING (
  -- Users can see their own memberships
  auth.uid() = user_id
  OR 
  -- Group creators can see all members
  EXISTS (
    SELECT 1 
    FROM public.groups g 
    WHERE g.id = group_members.group_id 
    AND g.created_by = auth.uid()
  )
  OR
  -- Group admins can see all members
  EXISTS (
    SELECT 1 
    FROM public.group_members gm 
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = 'admin'
  )
);

CREATE POLICY "group_members_insert_policy"
ON public.group_members
FOR INSERT
WITH CHECK (
  -- Users can join groups themselves
  auth.uid() = user_id
  OR 
  -- Group creators can add members
  EXISTS (
    SELECT 1 
    FROM public.groups g 
    WHERE g.id = group_members.group_id 
    AND g.created_by = auth.uid()
  )
  OR
  -- Group admins can add members
  EXISTS (
    SELECT 1 
    FROM public.group_members gm 
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = 'admin'
  )
);

CREATE POLICY "group_members_update_policy"
ON public.group_members
FOR UPDATE
USING (
  -- Users can update their own membership (leave)
  auth.uid() = user_id
  OR 
  -- Group creators can update any member
  EXISTS (
    SELECT 1 
    FROM public.groups g 
    WHERE g.id = group_members.group_id 
    AND g.created_by = auth.uid()
  )
  OR
  -- Group admins can update any member
  EXISTS (
    SELECT 1 
    FROM public.group_members gm 
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = 'admin'
  )
)
WITH CHECK (
  -- Same conditions for updates
  auth.uid() = user_id
  OR 
  EXISTS (
    SELECT 1 
    FROM public.groups g 
    WHERE g.id = group_members.group_id 
    AND g.created_by = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 
    FROM public.group_members gm 
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = 'admin'
  )
);

CREATE POLICY "group_members_delete_policy"
ON public.group_members
FOR DELETE
USING (
  -- Users can leave groups themselves
  auth.uid() = user_id
  OR 
  -- Group creators can remove any member
  EXISTS (
    SELECT 1 
    FROM public.groups g 
    WHERE g.id = group_members.group_id 
    AND g.created_by = auth.uid()
  )
  OR
  -- Group admins can remove any member
  EXISTS (
    SELECT 1 
    FROM public.group_members gm 
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = 'admin'
  )
);

-- Step 7: Create comprehensive RLS policies for group_messages table
CREATE POLICY "group_messages_select_policy"
ON public.group_messages
FOR SELECT
USING (
  -- Only group members can see messages
  EXISTS (
    SELECT 1 
    FROM public.group_members gm 
    WHERE gm.group_id = group_messages.group_id 
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "group_messages_insert_policy"
ON public.group_messages
FOR INSERT
WITH CHECK (
  -- Only group members can send messages
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 
    FROM public.group_members gm 
    WHERE gm.group_id = group_messages.group_id 
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "group_messages_update_policy"
ON public.group_messages
FOR UPDATE
USING (
  -- Users can update their own messages
  auth.uid() = sender_id
)
WITH CHECK (
  -- Ensure sender remains the same
  auth.uid() = sender_id
);

CREATE POLICY "group_messages_delete_policy"
ON public.group_messages
FOR DELETE
USING (
  -- Users can delete their own messages
  auth.uid() = sender_id
);

-- Step 8: Create a helper function to add members (for testing/debugging)
CREATE OR REPLACE FUNCTION public.add_group_member(p_group_id uuid, p_user_id uuid, p_role text DEFAULT 'member')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    can_add boolean := false;
BEGIN
    -- Check if current user can add members
    SELECT (
        -- Current user is group creator
        EXISTS (SELECT 1 FROM public.groups WHERE id = p_group_id AND created_by = auth.uid())
        OR
        -- Current user is group admin
        EXISTS (SELECT 1 FROM public.group_members WHERE group_id = p_group_id AND user_id = auth.uid() AND role = 'admin')
    ) INTO can_add;
    
    IF can_add THEN
        -- Try to insert the member
        INSERT INTO public.group_members (group_id, user_id, role)
        VALUES (p_group_id, p_user_id, p_role)
        ON CONFLICT (group_id, user_id) DO UPDATE SET role = p_role;
        
        RETURN true;
    ELSE
        RETURN false;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_group_member(uuid, uuid, text) TO anon, authenticated;

-- Step 9: Ensure group creators are automatically added as members
-- This fixes the issue where group creators might not be in the group_members table
INSERT INTO public.group_members (group_id, user_id, role)
SELECT id, created_by, 'admin'
FROM public.groups
WHERE NOT EXISTS (
    SELECT 1 
    FROM public.group_members gm 
    WHERE gm.group_id = groups.id 
    AND gm.user_id = groups.created_by
)
ON CONFLICT (group_id, user_id) DO UPDATE SET role = 'admin';

-- Step 10: Add a comment explaining the fix
COMMENT ON TABLE public.group_members IS 'Group membership table with comprehensive RLS policies that allow group creators and admins to add members';
COMMENT ON FUNCTION public.add_group_member IS 'Helper function to safely add members to groups with proper permission checks';
