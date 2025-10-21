-- Fix group messaging - allow members to see all messages in their groups
-- Run this in Supabase SQL Editor

-- Drop existing group_messages policies
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

-- Create new group_messages policies that allow group members to see all messages
CREATE POLICY "group_messages_select_member"
ON public.group_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.group_members gm 
    WHERE gm.group_id = group_messages.group_id 
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "group_messages_insert_member"
ON public.group_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 
    FROM public.group_members gm 
    WHERE gm.group_id = group_messages.group_id 
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "group_messages_update_sender"
ON public.group_messages
FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "group_messages_delete_sender"
ON public.group_messages
FOR DELETE
USING (auth.uid() = sender_id);

-- Also fix group_members policies to allow viewing all members in groups you're part of
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

CREATE POLICY "group_members_select_member"
ON public.group_members
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 
    FROM public.group_members gm 
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "group_members_insert_self"
ON public.group_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "group_members_update_self"
ON public.group_members
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "group_members_delete_self"
ON public.group_members
FOR DELETE
USING (auth.uid() = user_id);

-- Also fix groups policies to allow viewing groups you're a member of
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'groups' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.groups', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "groups_select_member"
ON public.groups
FOR SELECT
USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 
    FROM public.group_members gm 
    WHERE gm.group_id = groups.id 
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "groups_insert_creator"
ON public.groups
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "groups_update_creator"
ON public.groups
FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "groups_delete_creator"
ON public.groups
FOR DELETE
USING (auth.uid() = created_by);
