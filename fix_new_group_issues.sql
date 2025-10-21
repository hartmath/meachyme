-- Fix all issues with new group system
-- This will resolve 406 errors, missing columns, and RLS problems

-- Step 1: Drop and recreate tables with proper structure
DROP TABLE IF EXISTS public.new_group_messages CASCADE;
DROP TABLE IF EXISTS public.new_group_members CASCADE;
DROP TABLE IF EXISTS public.new_groups CASCADE;

-- Step 2: Drop existing functions
DROP FUNCTION IF EXISTS public.add_creator_to_new_group() CASCADE;
DROP FUNCTION IF EXISTS public.is_new_group_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_new_group_admin(uuid) CASCADE;

-- Step 3: Create new_groups table with proper structure
CREATE TABLE public.new_groups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 4: Create new_group_members table
CREATE TABLE public.new_group_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.new_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(group_id, user_id)
);

-- Step 5: Create new_group_messages table with is_read column
CREATE TABLE public.new_group_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.new_groups(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'voice')),
    attachment_url TEXT,
    attachment_metadata JSONB,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 6: Enable RLS
ALTER TABLE public.new_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_group_messages ENABLE ROW LEVEL SECURITY;

-- Step 7: Create PERMISSIVE RLS policies (allow all authenticated users)

-- New groups policies - allow all authenticated users to read
CREATE POLICY "new_groups_select_authenticated"
ON public.new_groups
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "new_groups_insert_authenticated"
ON public.new_groups
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "new_groups_update_creator"
ON public.new_groups
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "new_groups_delete_creator"
ON public.new_groups
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- New group members policies - allow all authenticated users to read
CREATE POLICY "new_group_members_select_authenticated"
ON public.new_group_members
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "new_group_members_insert_authenticated"
ON public.new_group_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "new_group_members_update_self"
ON public.new_group_members
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "new_group_members_delete_self"
ON public.new_group_members
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- New group messages policies - allow all authenticated users to read
CREATE POLICY "new_group_messages_select_authenticated"
ON public.new_group_messages
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "new_group_messages_insert_authenticated"
ON public.new_group_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "new_group_messages_update_sender"
ON public.new_group_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "new_group_messages_delete_sender"
ON public.new_group_messages
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);

-- Step 8: Create trigger to auto-add creator as admin
CREATE OR REPLACE FUNCTION public.add_creator_to_new_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.new_group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT (group_id, user_id) DO UPDATE SET role='admin';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_add_creator_to_new_group
AFTER INSERT ON public.new_groups
FOR EACH ROW EXECUTE FUNCTION public.add_creator_to_new_group();

-- Step 9: Create indexes for performance
CREATE INDEX idx_new_group_members_group_id ON public.new_group_members(group_id);
CREATE INDEX idx_new_group_members_user_id ON public.new_group_members(user_id);
CREATE INDEX idx_new_group_messages_group_id ON public.new_group_messages(group_id);
CREATE INDEX idx_new_group_messages_created_at ON public.new_group_messages(created_at);
CREATE INDEX idx_new_group_messages_is_read ON public.new_group_messages(is_read);

-- Step 10: Create helper functions
CREATE OR REPLACE FUNCTION public.is_new_group_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.new_group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_new_group_admin(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.new_group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
  );
$$;

-- Step 11: Grant permissions
GRANT EXECUTE ON FUNCTION public.is_new_group_member(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_new_group_admin(uuid) TO anon, authenticated;

-- Step 12: Enable real-time for the new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.new_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.new_group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.new_group_messages;

-- Step 13: Grant table permissions
GRANT ALL ON public.new_groups TO authenticated;
GRANT ALL ON public.new_group_members TO authenticated;
GRANT ALL ON public.new_group_messages TO authenticated;

-- Step 14: Test data insertion (optional - remove after testing)
-- INSERT INTO public.new_groups (name, description, created_by) 
-- VALUES ('Test Group', 'A test group', auth.uid());
