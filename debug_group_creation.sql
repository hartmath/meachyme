-- Debug and fix group creation issues
-- This script will help identify and resolve group creation problems

-- Step 1: Check current policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename IN ('groups', 'group_members', 'group_messages')
ORDER BY tablename, policyname;

-- Step 2: Test group creation permissions
DO $$
DECLARE
    test_user_id UUID;
    test_group_id UUID;
    result RECORD;
BEGIN
    -- Get a test user
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with user_id: %', test_user_id;
        
        -- Test if user can create a group
        BEGIN
            INSERT INTO public.groups (name, description, created_by)
            VALUES ('Test Group', 'Test Description', test_user_id)
            RETURNING id INTO test_group_id;
            
            RAISE NOTICE 'Group creation successful! Group ID: %', test_group_id;
            
            -- Test if user can add themselves as member
            BEGIN
                INSERT INTO public.group_members (group_id, user_id, role)
                VALUES (test_group_id, test_user_id, 'admin');
                
                RAISE NOTICE 'Member addition successful!';
                
                -- Clean up test data
                DELETE FROM public.group_members WHERE group_id = test_group_id;
                DELETE FROM public.groups WHERE id = test_group_id;
                
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'Member addition failed: %', SQLERRM;
                    -- Clean up group if member addition failed
                    DELETE FROM public.groups WHERE id = test_group_id;
            END;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Group creation failed: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'No test user available';
    END IF;
END $$;

-- Step 3: Check if helper functions exist and work
DO $$
DECLARE
    test_group_id UUID;
    test_user_id UUID;
    result BOOLEAN;
BEGIN
    -- Get test data
    SELECT id INTO test_group_id FROM public.groups LIMIT 1;
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_group_id IS NOT NULL AND test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing helper functions with group_id: %, user_id: %', test_group_id, test_user_id;
        
        -- Test is_group_creator
        BEGIN
            SELECT public.is_group_creator(test_group_id) INTO result;
            RAISE NOTICE 'is_group_creator result: %', result;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'is_group_creator error: %', SQLERRM;
        END;
        
        -- Test is_group_member
        BEGIN
            SELECT public.is_group_member(test_group_id) INTO result;
            RAISE NOTICE 'is_group_member result: %', result;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'is_group_member error: %', SQLERRM;
        END;
        
        -- Test is_group_admin
        BEGIN
            SELECT public.is_group_admin(test_group_id) INTO result;
            RAISE NOTICE 'is_group_admin result: %', result;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'is_group_admin error: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'No test data available for helper function testing';
    END IF;
END $$;

-- Step 4: Create a simple group creation test function
CREATE OR REPLACE FUNCTION public.test_group_creation(p_name text, p_description text DEFAULT '')
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
    
    -- Try to create group
    BEGIN
        INSERT INTO public.groups (name, description, created_by)
        VALUES (p_name, p_description, current_user_id)
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

GRANT EXECUTE ON FUNCTION public.test_group_creation(text, text) TO anon, authenticated;

-- Step 5: Test the function
SELECT public.test_group_creation('Debug Test Group', 'This is a test group for debugging');

-- Step 6: Check table constraints and triggers
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name IN ('groups', 'group_members', 'group_messages')
ORDER BY tc.table_name, tc.constraint_type;
