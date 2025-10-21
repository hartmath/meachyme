-- Create new group system with fresh tables
-- This avoids all the RLS recursion issues

-- Step 1: Create new_groups table
CREATE TABLE public.new_groups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 2: Create new_group_members table
CREATE TABLE public.new_group_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.new_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(group_id, user_id)
);

-- Step 3: Create new_group_messages table
CREATE TABLE public.new_group_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.new_groups(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'voice')),
    attachment_url TEXT,
    attachment_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 4: Enable RLS (but keep it simple)
ALTER TABLE public.new_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_group_messages ENABLE ROW LEVEL SECURITY;

-- Step 5: Create simple, non-recursive RLS policies

-- New groups policies
CREATE POLICY "new_groups_select_all"
ON public.new_groups
FOR SELECT
USING (true);

CREATE POLICY "new_groups_insert_authenticated"
ON public.new_groups
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "new_groups_update_creator"
ON public.new_groups
FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "new_groups_delete_creator"
ON public.new_groups
FOR DELETE
USING (auth.uid() = created_by);

-- New group members policies
CREATE POLICY "new_group_members_select_all"
ON public.new_group_members
FOR SELECT
USING (true);

CREATE POLICY "new_group_members_insert_authenticated"
ON public.new_group_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "new_group_members_update_self"
ON public.new_group_members
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "new_group_members_delete_self"
ON public.new_group_members
FOR DELETE
USING (auth.uid() = user_id);

-- New group messages policies
CREATE POLICY "new_group_messages_select_all"
ON public.new_group_messages
FOR SELECT
USING (true);

CREATE POLICY "new_group_messages_insert_authenticated"
ON public.new_group_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "new_group_messages_update_sender"
ON public.new_group_messages
FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "new_group_messages_delete_sender"
ON public.new_group_messages
FOR DELETE
USING (auth.uid() = sender_id);

-- Step 6: Create trigger to auto-add creator as admin
CREATE OR REPLACE FUNCTION public.add_creator_to_new_group()
RETURNS trigger
LANGUAGE plpgsql
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

-- Step 7: Create indexes for performance
CREATE INDEX idx_new_group_members_group_id ON public.new_group_members(group_id);
CREATE INDEX idx_new_group_members_user_id ON public.new_group_members(user_id);
CREATE INDEX idx_new_group_messages_group_id ON public.new_group_messages(group_id);
CREATE INDEX idx_new_group_messages_created_at ON public.new_group_messages(created_at);

-- Step 8: Create helper functions for the new system
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

GRANT EXECUTE ON FUNCTION public.is_new_group_member(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_new_group_admin(uuid) TO anon, authenticated;
