-- Quick fix for group creation - run this in Supabase SQL Editor
-- This will fix the immediate group creation issues

-- Step 1: Fix the group creation policy to be more permissive
DROP POLICY IF EXISTS "groups_insert_policy" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;

CREATE POLICY "groups_insert_policy"
ON public.groups
FOR INSERT
WITH CHECK (
  -- Only authenticated users can create groups
  auth.uid() IS NOT NULL
  AND auth.uid() = created_by
);

-- Step 2: Fix the group_members insert policy
DROP POLICY IF EXISTS "group_members_insert_policy" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups or be added by creators/admins" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;

CREATE POLICY "group_members_insert_policy"
ON public.group_members
FOR INSERT
WITH CHECK (
  -- Users can join groups themselves
  auth.uid() = user_id
  OR 
  -- Group creators can add members (direct check)
  EXISTS (
    SELECT 1 
    FROM public.groups g 
    WHERE g.id = group_members.group_id 
    AND g.created_by = auth.uid()
  )
);

-- Step 3: Create the helper function for group creation
CREATE OR REPLACE FUNCTION public.create_group_with_creator_membership(p_name text, p_description text DEFAULT '', p_avatar_url text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
    new_group_id UUID;
    result json;
BEGIN
    -- Get current user - try multiple methods
    current_user_id := auth.uid();
    
    -- Debug: log the user ID
    RAISE NOTICE 'Current user ID: %', current_user_id;
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE 'User not authenticated - auth.uid() returned NULL';
        RETURN json_build_object('success', false, 'error', 'User not authenticated - please sign in again');
    END IF;
    
    -- Validate input
    IF p_name IS NULL OR trim(p_name) = '' THEN
        RETURN json_build_object('success', false, 'error', 'Group name is required');
    END IF;
    
    -- Try to create group
    BEGIN
        RAISE NOTICE 'Creating group with name: %, user: %', trim(p_name), current_user_id;
        
        INSERT INTO public.groups (name, description, avatar_url, created_by)
        VALUES (trim(p_name), COALESCE(trim(p_description), ''), p_avatar_url, current_user_id)
        RETURNING id INTO new_group_id;
        
        RAISE NOTICE 'Group created with ID: %', new_group_id;
        
        -- Try to add creator as admin member
        INSERT INTO public.group_members (group_id, user_id, role)
        VALUES (new_group_id, current_user_id, 'admin');
        
        RAISE NOTICE 'Creator added as admin member';
        
        RETURN json_build_object(
            'success', true, 
            'group_id', new_group_id,
            'message', 'Group created successfully'
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Error creating group: %', SQLERRM;
            RETURN json_build_object(
                'success', false, 
                'error', SQLERRM,
                'code', SQLSTATE
            );
    END;
END;
$$;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION public.create_group_with_creator_membership(text, text, text) TO anon, authenticated;

-- Step 5: Test the function
SELECT public.create_group_with_creator_membership('Test Group', 'Test Description');

-- Step 6: Clean up test group
DO $$
DECLARE
    test_group_id UUID;
BEGIN
    SELECT id INTO test_group_id FROM public.groups WHERE name = 'Test Group' LIMIT 1;
    IF test_group_id IS NOT NULL THEN
        DELETE FROM public.group_members WHERE group_id = test_group_id;
        DELETE FROM public.groups WHERE id = test_group_id;
        RAISE NOTICE 'Test group cleaned up';
    END IF;
END $$;
