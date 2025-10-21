-- Comprehensive fix for group creation issues
-- This migration will resolve all group creation problems

-- Step 1: Completely reset all group-related policies and functions
-- Disable RLS temporarily
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
        WHERE proname IN ('is_group_creator', 'is_group_member', 'is_group_admin', 'test_group_creation', 'add_group_member')
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', 
                      func_record.proname, func_record.argtypes);
    END LOOP;
END $$;

-- Step 2: Create simple, reliable helper functions
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

-- Step 5: Create simple, working RLS policies for groups table
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

-- Step 6: Create simple, working RLS policies for group_members table
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

-- Step 7: Create simple, working RLS policies for group_messages table
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

-- Step 8: Create a helper function to safely create groups
CREATE OR REPLACE FUNCTION public.create_group_with_creator_membership(p_name text, p_description text DEFAULT '', p_avatar_url text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    new_group_id UUID;
    result json;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not authenticated');
    END IF;
    
    -- Validate input
    IF p_name IS NULL OR trim(p_name) = '' THEN
        RETURN json_build_object('success', false, 'error', 'Group name is required');
    END IF;
    
    -- Try to create group
    BEGIN
        INSERT INTO public.groups (name, description, avatar_url, created_by)
        VALUES (trim(p_name), COALESCE(trim(p_description), ''), p_avatar_url, current_user_id)
        RETURNING id INTO new_group_id;
        
        -- Try to add creator as admin member
        INSERT INTO public.group_members (group_id, user_id, role)
        VALUES (new_group_id, current_user_id, 'admin');
        
        RETURN json_build_object(
            'success', true, 
            'group_id', new_group_id,
            'message', 'Group created successfully'
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN json_build_object(
                'success', false, 
                'error', SQLERRM,
                'code', SQLSTATE
            );
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_group_with_creator_membership(text, text, text) TO anon, authenticated;

-- Step 9: Ensure existing group creators are members (fix any missing memberships)
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

-- Step 10: Test the group creation
DO $$
DECLARE
    test_result json;
BEGIN
    test_result := public.create_group_with_creator_membership('Test Group', 'Test Description');
    RAISE NOTICE 'Group creation test result: %', test_result;
    
    -- Clean up test group if successful
    IF (test_result->>'success')::boolean THEN
        DELETE FROM public.group_members WHERE group_id = (test_result->>'group_id')::uuid;
        DELETE FROM public.groups WHERE id = (test_result->>'group_id')::uuid;
        RAISE NOTICE 'Test group cleaned up successfully';
    END IF;
END $$;

-- Add comments
COMMENT ON TABLE public.groups IS 'Groups table with comprehensive RLS policies for secure group management';
COMMENT ON TABLE public.group_members IS 'Group membership table with policies allowing creators and admins to manage members';
COMMENT ON FUNCTION public.create_group_with_creator_membership IS 'Helper function to safely create groups with automatic creator membership';
