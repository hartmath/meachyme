-- Nuclear fix: completely remove all policies and recreate simple ones
-- This will eliminate all recursion issues

-- Step 1: Disable RLS temporarily
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
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

-- Step 3: Re-enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Step 4: Create SIMPLE policies with NO cross-table references

-- Groups policies (only reference groups table)
CREATE POLICY "groups_select_creator"
ON public.groups
FOR SELECT
USING (auth.uid() = created_by);

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

-- Group members policies (only reference group_members table)
CREATE POLICY "group_members_select_self"
ON public.group_members
FOR SELECT
USING (auth.uid() = user_id);

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

-- Group messages policies (only reference group_messages table)
CREATE POLICY "group_messages_select_sender"
ON public.group_messages
FOR SELECT
USING (auth.uid() = sender_id);

CREATE POLICY "group_messages_insert_sender"
ON public.group_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "group_messages_update_sender"
ON public.group_messages
FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "group_messages_delete_sender"
ON public.group_messages
FOR DELETE
USING (auth.uid() = sender_id);

-- Step 5: Create trigger to auto-add creator as admin
CREATE OR REPLACE FUNCTION public.add_creator_as_admin()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT (group_id, user_id) DO UPDATE SET role='admin';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_creator_as_admin ON public.groups;
CREATE TRIGGER trg_add_creator_as_admin
AFTER INSERT ON public.groups
FOR EACH ROW EXECUTE FUNCTION public.add_creator_as_admin();

-- Step 6: Backfill existing groups with creator memberships
INSERT INTO public.group_members (group_id, user_id, role)
SELECT g.id, g.created_by, 'admin'
FROM public.groups g
LEFT JOIN public.group_members gm
  ON gm.group_id = g.id AND gm.user_id = g.created_by
WHERE gm.group_id IS NULL
ON CONFLICT (group_id, user_id) DO UPDATE SET role = 'admin';
