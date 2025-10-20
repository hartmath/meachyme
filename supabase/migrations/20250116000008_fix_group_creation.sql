-- Fix group creation issues - comprehensive RLS policy cleanup and recreation
-- This migration fixes all group creation and management issues

-- Step 1: Drop ALL existing policies on group-related tables to start fresh
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

-- Step 2: Create simple, working helper functions for group operations
CREATE OR REPLACE FUNCTION public.is_group_creator_simple(p_group_id uuid)
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

CREATE OR REPLACE FUNCTION public.is_group_member_simple(p_group_id uuid)
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

CREATE OR REPLACE FUNCTION public.is_group_admin_simple(p_group_id uuid)
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

-- Grant permissions for helper functions
GRANT EXECUTE ON FUNCTION public.is_group_creator_simple(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member_simple(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin_simple(uuid) TO anon, authenticated;

-- Step 3: Create clean, simple RLS policies for groups table
CREATE POLICY "Users can view groups they created or are members of"
ON public.groups
FOR SELECT
USING (
  auth.uid() = created_by
  OR public.is_group_member_simple(id)
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

-- Step 4: Create clean, simple RLS policies for group_members table
CREATE POLICY "Users can view group memberships"
ON public.group_members
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_group_creator_simple(group_id)
  OR public.is_group_admin_simple(group_id)
);

CREATE POLICY "Users can join groups or be added by creators/admins"
ON public.group_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR public.is_group_creator_simple(group_id)
  OR public.is_group_admin_simple(group_id)
);

CREATE POLICY "Users can leave groups or be removed by creators/admins"
ON public.group_members
FOR DELETE
USING (
  auth.uid() = user_id
  OR public.is_group_creator_simple(group_id)
  OR public.is_group_admin_simple(group_id)
);

CREATE POLICY "Group creators and admins can update member roles"
ON public.group_members
FOR UPDATE
USING (
  public.is_group_creator_simple(group_id)
  OR public.is_group_admin_simple(group_id)
)
WITH CHECK (
  public.is_group_creator_simple(group_id)
  OR public.is_group_admin_simple(group_id)
);

-- Step 5: Create clean, simple RLS policies for group_messages table
CREATE POLICY "Users can view messages from groups they are members of"
ON public.group_messages
FOR SELECT
USING (
  public.is_group_member_simple(group_id)
);

CREATE POLICY "Group members can send messages"
ON public.group_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_group_member_simple(group_id)
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

-- Step 6: Ensure RLS is enabled on all tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
