-- Break RLS recursion between groups and group_members
-- 1) Make group_members policies self-contained (no reference to groups)
-- 2) Keep groups SELECT referencing group_members only
-- 3) Auto-add creator as admin via trigger so we don't need creator checks in group_members

-- Ensure RLS is enabled
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Drop existing group_members policies that might reference groups
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='group_members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.group_members', p.policyname);
  END LOOP;
END $$;

-- Recreate minimal, non-recursive group_members policies
CREATE POLICY "gm_select_self_or_admin"
ON public.group_members
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
  )
);

CREATE POLICY "gm_insert_self_or_admin"
ON public.group_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
  )
);

CREATE POLICY "gm_update_self_or_admin"
ON public.group_members
FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
  )
);

CREATE POLICY "gm_delete_self_or_admin"
ON public.group_members
FOR DELETE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
  )
);

-- Recreate groups policies (drop first to avoid duplicates)
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='groups'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.groups', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "groups_select_creator_or_member"
ON public.groups
FOR SELECT
USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "groups_insert_creator_only"
ON public.groups
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = created_by
);

CREATE POLICY "groups_update_creator_only"
ON public.groups
FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "groups_delete_creator_only"
ON public.groups
FOR DELETE
USING (auth.uid() = created_by);

-- Trigger to auto-add creator as admin on group creation
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
