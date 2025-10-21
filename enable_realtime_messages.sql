-- Ensure real-time is properly enabled for new group system tables
-- This will fix instant message display issues

-- Check if real-time is enabled for the tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('new_groups', 'new_group_members', 'new_group_messages');

-- Ensure the tables are added to the real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.new_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.new_group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.new_group_messages;

-- Check the publication status
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Ensure RLS policies allow real-time subscriptions
-- The policies should allow SELECT for authenticated users

-- Verify the tables exist and have proper structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('new_groups', 'new_group_members', 'new_group_messages')
ORDER BY table_name, ordinal_position;
