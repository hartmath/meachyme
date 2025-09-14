-- Complete fix for all group-related RLS issues
-- Run this script in your Supabase SQL Editor to fix group creation and functionality

-- ==============================================
-- FIX GROUP CREATION ISSUES
-- ==============================================

-- Drop and recreate the group creation policy
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;

CREATE POLICY "Authenticated users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() = created_by AND auth.uid() IS NOT NULL);

-- Allow group creators to add themselves as admin members
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;

CREATE POLICY "Users can join groups or be added by creators" 
ON public.group_members 
FOR INSERT 
WITH CHECK (
    auth.uid() = user_id 
    OR group_id IN (
        SELECT id 
        FROM public.groups 
        WHERE created_by = auth.uid()
    )
);

-- Allow users to view groups they created or are members of
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;

CREATE POLICY "Users can view groups they created or are members of" 
ON public.groups 
FOR SELECT 
USING (
    created_by = auth.uid()
    OR id IN (
        SELECT group_id 
        FROM public.group_members 
        WHERE user_id = auth.uid()
    )
);

-- ==============================================
-- FIX GROUP MESSAGING ISSUES
-- ==============================================

-- Drop existing problematic message policies
DROP POLICY IF EXISTS "Users can send messages to groups they created" ON public.group_messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.group_messages;

-- Create better RLS policies for group_messages
CREATE POLICY "Users can view messages from groups they are members of" 
ON public.group_messages 
FOR SELECT 
USING (
    group_id IN (
        SELECT group_id 
        FROM public.group_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can send messages to groups they are members of" 
ON public.group_messages 
FOR INSERT 
WITH CHECK (
    auth.uid() = sender_id 
    AND group_id IN (
        SELECT group_id 
        FROM public.group_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own messages in groups they are members of" 
ON public.group_messages 
FOR UPDATE 
USING (
    auth.uid() = sender_id 
    AND group_id IN (
        SELECT group_id 
        FROM public.group_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own messages in groups they are members of" 
ON public.group_messages 
FOR DELETE 
USING (
    auth.uid() = sender_id 
    AND group_id IN (
        SELECT group_id 
        FROM public.group_members 
        WHERE user_id = auth.uid()
    )
);

-- ==============================================
-- FIX GROUP MEMBERSHIP MANAGEMENT
-- ==============================================

-- Allow viewing other members in groups you belong to
DROP POLICY IF EXISTS "Users can view their own group memberships" ON public.group_members;

CREATE POLICY "Users can view members of groups they belong to" 
ON public.group_members 
FOR SELECT 
USING (
    group_id IN (
        SELECT group_id 
        FROM public.group_members 
        WHERE user_id = auth.uid()
    )
);

-- Allow group admins to remove members
CREATE POLICY "Group admins can remove members" 
ON public.group_members 
FOR DELETE 
USING (
    group_id IN (
        SELECT id 
        FROM public.groups 
        WHERE created_by = auth.uid()
    )
    OR group_id IN (
        SELECT group_id 
        FROM public.group_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR auth.uid() = user_id  -- Allow users to leave groups
);

-- Allow group admins to update member roles
CREATE POLICY "Group admins can update member roles" 
ON public.group_members 
FOR UPDATE 
USING (
    group_id IN (
        SELECT id 
        FROM public.groups 
        WHERE created_by = auth.uid()
    )
    OR group_id IN (
        SELECT group_id 
        FROM public.group_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- ==============================================
-- FIX GROUP CALLS ISSUES
-- ==============================================

-- Allow group members to view calls from their groups
DROP POLICY IF EXISTS "Users can view calls they initiated" ON public.group_calls;

CREATE POLICY "Users can view calls from groups they are members of" 
ON public.group_calls 
FOR SELECT 
USING (
    group_id IN (
        SELECT group_id 
        FROM public.group_members 
        WHERE user_id = auth.uid()
    )
);

-- Allow group members to create calls
CREATE POLICY "Group members can create calls" 
ON public.group_calls 
FOR INSERT 
WITH CHECK (
    auth.uid() = initiator_id 
    AND group_id IN (
        SELECT group_id 
        FROM public.group_members 
        WHERE user_id = auth.uid()
    )
);

-- Allow call initiators and group admins to update calls
CREATE POLICY "Call initiators and group admins can update calls" 
ON public.group_calls 
FOR UPDATE 
USING (
    auth.uid() = initiator_id 
    OR group_id IN (
        SELECT id 
        FROM public.groups 
        WHERE created_by = auth.uid()
    )
    OR group_id IN (
        SELECT group_id 
        FROM public.group_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- ==============================================
-- FIX GROUP CALL PARTICIPANTS ISSUES
-- ==============================================

-- Allow viewing participants of calls you're in
DROP POLICY IF EXISTS "Users can view their own call participation" ON public.group_call_participants;

CREATE POLICY "Users can view participants of calls they are in" 
ON public.group_call_participants 
FOR SELECT 
USING (
    call_id IN (
        SELECT gc.id 
        FROM public.group_calls gc
        JOIN public.group_members gm ON gc.group_id = gm.group_id
        WHERE gm.user_id = auth.uid()
    )
);

-- Allow group members to join calls
CREATE POLICY "Group members can join calls" 
ON public.group_call_participants 
FOR INSERT 
WITH CHECK (
    auth.uid() = user_id 
    AND call_id IN (
        SELECT gc.id 
        FROM public.group_calls gc
        JOIN public.group_members gm ON gc.group_id = gm.group_id
        WHERE gm.user_id = auth.uid()
    )
);

-- Allow users to update their own participation
CREATE POLICY "Users can update their own call participation" 
ON public.group_call_participants 
FOR UPDATE 
USING (auth.uid() = user_id);

-- ==============================================
-- VERIFICATION QUERIES (Optional - for testing)
-- ==============================================

-- Uncomment these to verify the policies are working:
-- SELECT 'Groups policies:' as test;
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename IN ('groups', 'group_members', 'group_messages', 'group_calls', 'group_call_participants')
-- ORDER BY tablename, policyname;

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

-- This will show a success message when the script completes
SELECT 'All group RLS policies have been fixed successfully!' as status;
