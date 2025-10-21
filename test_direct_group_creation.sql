-- Ensure RLS policies work for direct database calls
-- Run this in Supabase SQL Editor

-- Step 1: Verify current RLS policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('groups', 'group_members')
ORDER BY tablename, policyname;

-- Step 2: Test direct group creation (this should work from frontend)
-- This simulates what the frontend will do
DO $$
DECLARE
    test_user_id UUID;
    new_group_id UUID;
BEGIN
    -- Get a test user
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing direct group creation with user: %', test_user_id;
        
        -- Test group creation
        BEGIN
            INSERT INTO public.groups (name, description, created_by)
            VALUES ('Direct Test Group', 'Testing direct creation', test_user_id)
            RETURNING id INTO new_group_id;
            
            RAISE NOTICE 'Group created successfully with ID: %', new_group_id;
            
            -- Test member addition
            BEGIN
                INSERT INTO public.group_members (group_id, user_id, role)
                VALUES (new_group_id, test_user_id, 'admin');
                
                RAISE NOTICE 'Member added successfully';
                
                -- Clean up
                DELETE FROM public.group_members WHERE group_id = new_group_id;
                DELETE FROM public.groups WHERE id = new_group_id;
                
                RAISE NOTICE 'Test completed successfully - direct method works!';
                
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'Member addition failed: %', SQLERRM;
                    DELETE FROM public.groups WHERE id = new_group_id;
            END;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Group creation failed: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'No test user available';
    END IF;
END $$;

-- Step 3: Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('groups', 'group_members', 'group_messages')
AND schemaname = 'public';
