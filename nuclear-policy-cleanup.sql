-- Nuclear option: Complete RLS policy cleanup and rebuild
-- This script temporarily disables RLS, drops all policies, then rebuilds everything

-- Step 1: Temporarily disable RLS on all group tables
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_call_participants DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies (this will work now that RLS is disabled)
-- We'll use a more aggressive approach by dropping policies by pattern

-- Drop all policies for group_members
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

-- Drop all policies for group_messages
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

-- Drop all policies for groups
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

-- Drop all policies for group_calls
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'group_calls' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.group_calls', pol.policyname);
    END LOOP;
END $$;

-- Drop all policies for group_call_participants
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'group_call_participants' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.group_call_participants', pol.policyname);
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_call_participants ENABLE ROW LEVEL SECURITY;

-- Step 4: Create helper functions
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

-- Step 5: Create fresh, simple policies

-- Groups table policies
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

-- Group members table policies
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

-- Group messages table policies
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

-- Group calls table policies
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

-- Group call participants table policies
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
SELECT 'All RLS policies have been completely rebuilt using nuclear cleanup!' as status;
