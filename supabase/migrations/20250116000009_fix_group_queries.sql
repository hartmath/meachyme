-- Fix group member queries and RLS policies
-- This migration fixes the issues with group member display and messaging

-- Step 1: Drop all existing policies on group_members to start fresh
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'group_members' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.group_members', pol.policyname);
    END LOOP;
END $$;

-- Step 2: Create simple, working RLS policies for group_members
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

-- Step 3: Drop all existing policies on group_messages to start fresh
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'group_messages' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.group_messages', pol.policyname);
    END LOOP;
END $$;

-- Step 4: Create simple, working RLS policies for group_messages
CREATE POLICY "Group members can view messages"
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

-- Step 5: Ensure RLS is enabled
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
