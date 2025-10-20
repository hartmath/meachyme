-- Debug group issues - test helper functions and policies
-- This migration helps debug what's happening with group member addition

-- Test the helper functions
DO $$
DECLARE
    test_group_id UUID;
    test_user_id UUID;
    result BOOLEAN;
    group_creator_id UUID;
BEGIN
    -- Get a test group and user
    SELECT id INTO test_group_id FROM public.groups LIMIT 1;
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    SELECT created_by INTO group_creator_id FROM public.groups LIMIT 1;
    
    IF test_group_id IS NOT NULL AND test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with group_id: %, user_id: %, creator_id: %', test_group_id, test_user_id, group_creator_id;
        
        -- Test is_group_creator
        SELECT public.is_group_creator(test_group_id) INTO result;
        RAISE NOTICE 'is_group_creator test: %', result;
        
        -- Test is_group_member
        SELECT public.is_group_member(test_group_id) INTO result;
        RAISE NOTICE 'is_group_member test: %', result;
        
        -- Test is_group_admin
        SELECT public.is_group_admin(test_group_id) INTO result;
        RAISE NOTICE 'is_group_admin test: %', result;
        
        -- Test if user is creator
        IF test_user_id = group_creator_id THEN
            RAISE NOTICE 'Current user is the group creator';
        ELSE
            RAISE NOTICE 'Current user is NOT the group creator';
        END IF;
        
    ELSE
        RAISE NOTICE 'No test data available for helper function testing';
    END IF;
END $$;

-- Also create a simple test function to manually add a member
CREATE OR REPLACE FUNCTION public.test_add_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result boolean;
BEGIN
    -- Test if current user can add members
    SELECT public.is_group_creator(p_group_id) OR public.is_group_admin(p_group_id) INTO result;
    
    RAISE NOTICE 'Can add member: %', result;
    
    IF result THEN
        -- Try to insert the member
        INSERT INTO public.group_members (group_id, user_id, role)
        VALUES (p_group_id, p_user_id, 'member')
        ON CONFLICT (group_id, user_id) DO NOTHING;
        
        RAISE NOTICE 'Member added successfully';
        RETURN true;
    ELSE
        RAISE NOTICE 'Cannot add member - insufficient permissions';
        RETURN false;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding member: %', SQLERRM;
        RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.test_add_member(uuid, uuid) TO anon, authenticated;
