-- Test and verify helper functions are working correctly
-- This migration tests the helper functions to ensure they work properly

-- Test the helper functions by creating a simple test
DO $$
DECLARE
    test_group_id UUID;
    test_user_id UUID;
    result BOOLEAN;
BEGIN
    -- Get a test group and user
    SELECT id INTO test_group_id FROM public.groups LIMIT 1;
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_group_id IS NOT NULL AND test_user_id IS NOT NULL THEN
        -- Test is_group_creator_simple
        SELECT public.is_group_creator_simple(test_group_id) INTO result;
        RAISE NOTICE 'is_group_creator_simple test: %', result;
        
        -- Test is_group_member_simple
        SELECT public.is_group_member_simple(test_group_id) INTO result;
        RAISE NOTICE 'is_group_member_simple test: %', result;
        
        -- Test is_group_admin_simple
        SELECT public.is_group_admin_simple(test_group_id) INTO result;
        RAISE NOTICE 'is_group_admin_simple test: %', result;
    ELSE
        RAISE NOTICE 'No test data available for helper function testing';
    END IF;
END $$;

-- Also, let's make sure the helper functions are properly granted permissions
GRANT EXECUTE ON FUNCTION public.is_group_creator_simple(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member_simple(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin_simple(uuid) TO anon, authenticated;
