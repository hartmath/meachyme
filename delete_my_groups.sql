-- Delete all groups owned by the current authenticated user and their memberships
-- Run this in Supabase SQL Editor while authenticated (auth.uid() must be set)

DELETE FROM public.group_members
WHERE group_id IN (
  SELECT id FROM public.groups WHERE created_by = auth.uid()
);

DELETE FROM public.groups
WHERE created_by = auth.uid();
