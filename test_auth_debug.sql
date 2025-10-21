-- Test authentication and group creation
-- Run this in Supabase SQL Editor to debug the authentication issue

-- Test 1: Check current authentication
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role,
    auth.jwt() IS NOT NULL as has_jwt;

-- Test 2: Check if we can access auth.users table
SELECT 
    id,
    email,
    created_at
FROM auth.users 
WHERE id = auth.uid()
LIMIT 1;

-- Test 3: Test the group creation function with debug info
DO $$
DECLARE
    test_result json;
    user_id UUID;
BEGIN
    user_id := auth.uid();
    RAISE NOTICE 'Testing with user ID: %', user_id;
    
    IF user_id IS NULL THEN
        RAISE NOTICE 'ERROR: No authenticated user found';
        RAISE NOTICE 'This means the RPC call is not receiving authentication context';
    ELSE
        RAISE NOTICE 'SUCCESS: User is authenticated with ID: %', user_id;
        
        -- Test the function
        test_result := public.create_group_with_creator_membership('Auth Test Group', 'Testing authentication');
        RAISE NOTICE 'Function result: %', test_result;
        
        -- Clean up if successful
        IF (test_result->>'success')::boolean THEN
            DELETE FROM public.group_members WHERE group_id = (test_result->>'group_id')::uuid;
            DELETE FROM public.groups WHERE id = (test_result->>'group_id')::uuid;
            RAISE NOTICE 'Test group cleaned up';
        END IF;
    END IF;
END $$;

-- Test 4: Check RLS policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'groups' 
AND policyname = 'groups_insert_policy';
