-- Complete cleanup of all group-related RLS policies
-- This script removes ALL existing policies and creates fresh ones

-- First, let's see what policies exist (this will help us identify any we missed)
-- You can run this query first to see all existing policies:
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename LIKE 'group%';

-- Drop ALL possible policies for group_members table
DROP POLICY IF EXISTS "Users can view members of groups they belong to" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups or be added by creators" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can remove members" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can update member roles" ON public.group_members;
DROP POLICY IF EXISTS "Users can view their own group memberships" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can add members" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can remove members" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can update member roles" ON public.group_members;

-- Drop ALL possible policies for group_messages table
DROP POLICY IF EXISTS "Users can view messages from groups they are members of" ON public.group_messages;
DROP POLICY IF EXISTS "Users can send messages to groups they are members of" ON public.group_messages;
DROP POLICY IF EXISTS "Users can update their own messages in groups they are members of" ON public.group_messages;
DROP POLICY IF EXISTS "Users can delete their own messages in groups they are members of" ON public.group_messages;
DROP POLICY IF EXISTS "Users can send messages to groups they created" ON public.group_messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.group_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.group_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.group_messages;
DROP POLICY IF EXISTS "Group members can view messages" ON public.group_messages;
DROP POLICY IF EXISTS "Group members can send messages" ON public.group_messages;

-- Drop ALL possible policies for groups table
DROP POLICY IF EXISTS "Users can view groups they created or are members of" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Group admins can update their groups" ON public.groups;
DROP POLICY IF EXISTS "Group admins can delete their groups" ON public.groups;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can delete their groups" ON public.groups;
DROP POLICY IF EXISTS "Users can view all groups" ON public.groups;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
DROP POLICY IF EXISTS "Group admins can update their groups" ON public.groups;
DROP POLICY IF EXISTS "Group admins can delete their groups" ON public.groups;

-- Drop ALL possible policies for group_calls table
DROP POLICY IF EXISTS "Users can view calls from groups they are members of" ON public.group_calls;
DROP POLICY IF EXISTS "Group members can create calls" ON public.group_calls;
DROP POLICY IF EXISTS "Call initiators and group admins can update calls" ON public.group_calls;
DROP POLICY IF EXISTS "Users can view calls they initiated" ON public.group_calls;
DROP POLICY IF EXISTS "Users can create group calls" ON public.group_calls;
DROP POLICY IF EXISTS "Users can update calls they initiated" ON public.group_calls;
DROP POLICY IF EXISTS "Group members can view calls" ON public.group_calls;
DROP POLICY IF EXISTS "Call initiators can update calls" ON public.group_calls;

-- Drop ALL possible policies for group_call_participants table
DROP POLICY IF EXISTS "Users can view participants of calls they are in" ON public.group_call_participants;
DROP POLICY IF EXISTS "Group members can join calls" ON public.group_call_participants;
DROP POLICY IF EXISTS "Users can update their own call participation" ON public.group_call_participants;
DROP POLICY IF EXISTS "Users can view their own call participation" ON public.group_call_participants;
DROP POLICY IF EXISTS "Users can join group calls" ON public.group_call_participants;
DROP POLICY IF EXISTS "Call participants can view participation" ON public.group_call_participants;
DROP POLICY IF EXISTS "Users can join calls" ON public.group_call_participants;

-- Now create the helper functions
CREATE OR REPLACE FUNCTION is_group_creator(group_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_id_param 
    AND created_by = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_group_member(group_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_id_param 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simple, non-recursive policies for group_members
CREATE POLICY "Users can view own memberships" 
ON public.group_members 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can join groups" 
ON public.group_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups" 
ON public.group_members 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Group creators can add members" 
ON public.group_members 
FOR INSERT 
WITH CHECK (is_group_creator(group_id));

CREATE POLICY "Group creators can remove members" 
ON public.group_members 
FOR DELETE 
USING (is_group_creator(group_id));

CREATE POLICY "Group creators can update member roles" 
ON public.group_members 
FOR UPDATE 
USING (is_group_creator(group_id));

-- Create simple policies for groups table
CREATE POLICY "Users can view all groups" 
ON public.groups 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update their groups" 
ON public.groups 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Group creators can delete their groups" 
ON public.groups 
FOR DELETE 
USING (auth.uid() = created_by);

-- Create simple policies for group_messages table
CREATE POLICY "Group members can view messages" 
ON public.group_messages 
FOR SELECT 
USING (is_group_member(group_id));

CREATE POLICY "Group members can send messages" 
ON public.group_messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id AND is_group_member(group_id));

CREATE POLICY "Users can update their own messages" 
ON public.group_messages 
FOR UPDATE 
USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" 
ON public.group_messages 
FOR DELETE 
USING (auth.uid() = sender_id);

-- Create simple policies for group_calls table
CREATE POLICY "Group members can view calls" 
ON public.group_calls 
FOR SELECT 
USING (is_group_member(group_id));

CREATE POLICY "Group members can create calls" 
ON public.group_calls 
FOR INSERT 
WITH CHECK (auth.uid() = initiator_id AND is_group_member(group_id));

CREATE POLICY "Call initiators can update calls" 
ON public.group_calls 
FOR UPDATE 
USING (auth.uid() = initiator_id);

-- Create simple policies for group_call_participants table
CREATE POLICY "Call participants can view participation" 
ON public.group_call_participants 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can join calls" 
ON public.group_call_participants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" 
ON public.group_call_participants 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Success message
SELECT 'All RLS policies have been completely rebuilt!' as status;
