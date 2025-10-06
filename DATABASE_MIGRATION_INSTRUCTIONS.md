# Database Migration Instructions for Chyme App

## Overview
This migration recreates the `profiles` table with the correct structure and ensures all chat functionality works properly.

## What This Migration Does

1. ✅ **Recreates profiles table** with `id` as primary key (referencing auth.users)
2. ✅ **Creates all necessary indexes** for performance
3. ✅ **Sets up Row Level Security (RLS)** policies
4. ✅ **Creates automatic profile creation** on user signup
5. ✅ **Creates profiles for existing users** who don't have them
6. ✅ **Creates profiles for chat partners** from existing messages
7. ✅ **Adds helper functions** for profile management

## How to Run the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/behddityjbiumdcgattw

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Or go to: https://supabase.com/dashboard/project/behddityjbiumdcgattw/sql

3. **Create a new query**
   - Click "New Query"

4. **Copy the migration SQL**
   - Open: `supabase/migrations/20250106000001_recreate_profiles_properly.sql`
   - Copy the entire contents

5. **Paste and run**
   - Paste into the SQL editor
   - Click "Run" or press `Ctrl+Enter`

6. **Verify success**
   - You should see "Success. No rows returned" or similar
   - Check the output for any errors

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Link your project (first time only)
supabase link --project-ref behddityjbiumdcgattw

# Run the migration
supabase db push

# Or apply the specific migration file
supabase db reset
```

### Option 3: Manual Migration via psql

If you have direct database access:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.behddityjbiumdcgattw.supabase.co:5432/postgres" -f supabase/migrations/20250106000001_recreate_profiles_properly.sql
```

## Verification Steps

After running the migration, verify it worked:

### 1. Check Total Profiles
```sql
SELECT COUNT(*) as total_profiles FROM public.profiles;
```
Should show at least 12 profiles (based on your test results)

### 2. Check All Auth Users Have Profiles
```sql
SELECT au.id, au.email, p.full_name
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
```
Should return 0 rows (all users have profiles)

### 3. Check Chat Partners Have Profiles
```sql
SELECT DISTINCT 
  CASE 
    WHEN p.id IS NULL THEN 'MISSING'
    ELSE 'EXISTS'
  END as profile_status,
  COUNT(*) as count
FROM (
  SELECT sender_id as user_id FROM public.direct_messages
  UNION
  SELECT recipient_id as user_id FROM public.direct_messages
) message_users
LEFT JOIN public.profiles p ON message_users.user_id = p.id
GROUP BY profile_status;
```
Should show all as 'EXISTS'

### 4. Test Profile Creation Trigger
```sql
-- This will be tested when new users sign up
-- The trigger should automatically create profiles
```

## What to Expect After Migration

✅ **Immediate Effects:**
- All existing users have profiles
- All chat partners have profiles (even if basic)
- Chat list will load and display conversations
- New signups automatically get profiles

✅ **In Your App:**
- Go to `/chats` - conversations should now display
- Go to `/test` - all tests should pass
- Profile data should be available everywhere

## Rollback (If Needed)

If something goes wrong, you can restore from the previous migration:

```sql
-- Restore from backup
-- (Supabase automatically creates backups)
-- Go to: Database > Backups in Supabase Dashboard
```

## Troubleshooting

### Issue: Migration fails with "relation already exists"
**Solution:** The migration includes `DROP TABLE IF EXISTS`, so this shouldn't happen. If it does:
```sql
DROP TABLE IF EXISTS public.profiles CASCADE;
-- Then run the migration again
```

### Issue: Some users still don't have profiles
**Solution:** Run this query:
```sql
SELECT public.ensure_user_profile(au.id)
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
```

### Issue: Chat partners don't have profiles
**Solution:** The migration includes Step 9 which handles this. If needed, rerun:
```sql
-- See Step 9 in the migration file
```

## After Migration Checklist

- [ ] Run verification queries
- [ ] Test signing in to the app
- [ ] Check `/chats` page loads with conversations
- [ ] Run `/test` and verify all tests pass
- [ ] Try creating a new user (test profile auto-creation)
- [ ] Check profile pages load correctly

## Support

If you encounter any issues:
1. Check the Supabase logs: Database > Logs
2. Check browser console for errors
3. Run the verification queries above
4. Share any error messages for debugging

## Notes

- This migration is **idempotent** - safe to run multiple times
- Existing data is preserved
- New profiles are created with placeholder data
- Profile creation is now automatic for new signups
- All RLS policies are properly configured
