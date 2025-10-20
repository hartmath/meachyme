-- Nuclear fix for all group issues - completely reset and recreate everything
-- This migration completely removes all policies and recreates them with simple, working logic

-- Step 1: Disable RLS temporarily to clean up
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on all group tables
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

-- Step 3: Drop all helper functions to start fresh
-- Drop all variations of these functions to avoid conflicts
DROP FUNCTION IF EXISTS public.is_group_creator CASCADE;
DROP FUNCTION IF EXISTS public.is_group_member CASCADE;
DROP FUNCTION IF EXISTS public.is_group_admin CASCADE;
DROP FUNCTION IF EXISTS public.is_group_creator_simple CASCADE;
DROP FUNCTION IF EXISTS public.is_group_member_simple CASCADE;
DROP FUNCTION IF EXISTS public.is_group_admin_simple CASCADE;
DROP FUNCTION IF EXISTS public.is_group_creator_base CASCADE;
DROP FUNCTION IF EXISTS public.is_group_creator_wrapper CASCADE;
DROP FUNCTION IF EXISTS public.is_group_admin_base CASCADE;
DROP FUNCTION IF EXISTS public.is_group_admin_wrapper CASCADE;

-- Also drop any functions with different parameter names
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Drop all functions named is_group_creator, is_group_member, is_group_admin
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as argtypes
        FROM pg_proc 
        WHERE proname IN ('is_group_creator', 'is_group_member', 'is_group_admin')
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', 
                      func_record.proname, func_record.argtypes);
    END LOOP;
END $$;

-- Step 4: Create simple, working helper functions
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

-- Step 5: Grant permissions for helper functions
GRANT EXECUTE ON FUNCTION public.is_group_creator(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid) TO anon, authenticated;

-- Step 6: Re-enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Step 7: Create simple, working RLS policies for groups table
CREATE POLICY "Users can view groups they created or are members of"
ON public.groups
FOR SELECT
USING (
  auth.uid() = created_by
  OR public.is_group_member(id)
);

CREATE POLICY "Authenticated users can create groups"
ON public.groups
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Group creators can update their groups"
ON public.groups
FOR UPDATE
USING (
  auth.uid() = created_by
)
WITH CHECK (
  auth.uid() = created_by
);

CREATE POLICY "Group creators can delete their groups"
ON public.groups
FOR DELETE
USING (
  auth.uid() = created_by
);

-- Step 8: Create simple, working RLS policies for group_members table
CREATE POLICY "Users can view group memberships"
ON public.group_members
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_group_creator(group_id)
  OR public.is_group_admin(group_id)
);

CREATE POLICY "Users can join groups or be added by creators/admins"
ON public.group_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR public.is_group_creator(group_id)
  OR public.is_group_admin(group_id)
);

CREATE POLICY "Users can leave groups or be removed by creators/admins"
ON public.group_members
FOR DELETE
USING (
  auth.uid() = user_id
  OR public.is_group_creator(group_id)
  OR public.is_group_admin(group_id)
);

CREATE POLICY "Group creators and admins can update member roles"
ON public.group_members
FOR UPDATE
USING (
  public.is_group_creator(group_id)
  OR public.is_group_admin(group_id)
)
WITH CHECK (
  public.is_group_creator(group_id)
  OR public.is_group_admin(group_id)
);

-- Step 9: Create simple, working RLS policies for group_messages table
CREATE POLICY "Group members can view messages"
ON public.group_messages
FOR SELECT
USING (
  public.is_group_member(group_id)
);

CREATE POLICY "Group members can send messages"
ON public.group_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_group_member(group_id)
);

CREATE POLICY "Users can update their own messages"
ON public.group_messages
FOR UPDATE
USING (
  auth.uid() = sender_id
)
WITH CHECK (
  auth.uid() = sender_id
);

CREATE POLICY "Users can delete their own messages"
ON public.group_messages
FOR DELETE
USING (
  auth.uid() = sender_id
);
