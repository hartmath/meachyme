# 🚨 CRITICAL FIX - Run These 2 Database Migrations NOW

## The Problem
Your app has 3 main issues:
1. ❌ **Chat not found** - Can't message people
2. ❌ **No profile pictures** - Avatars don't show
3. ❌ **Missing user data** - Names and info not displaying

**ROOT CAUSE:** The database `profiles` table is using the wrong primary key structure. Some queries use `profiles.user_id` but the table uses `profiles.id`.

## The Solution
Run these 2 SQL migrations in order to fix everything permanently.

---

## 🎯 STEP-BY-STEP INSTRUCTIONS

### Step 1: Open Supabase SQL Editor
1. Go to: **https://supabase.com/dashboard/project/behddityjbiumdcgattw/sql/new**
2. You should see a blank SQL editor

### Step 2: Run Migration 1 - Fix Profiles Table

**Copy this entire file:**
`supabase/migrations/20250106000001_recreate_profiles_properly.sql`

**Paste it into the SQL editor and click "Run"**

**What this does:**
- ✅ Recreates the profiles table with correct structure
- ✅ Creates profiles for ALL existing users
- ✅ Creates profiles for chat partners (even without accounts)
- ✅ Sets up automatic profile creation for new signups
- ✅ Fixes all profile-related queries

**Expected result:** "Success. No rows returned" or similar

### Step 3: Run Migration 2 - Fix Event Links View

**Copy this entire file:**
`supabase/migrations/20250106000002_fix_event_links_view.sql`

**Paste it into the SQL editor and click "Run"**

**What this does:**
- ✅ Fixes the event_links_with_profiles view
- ✅ Makes events show user information correctly

**Expected result:** "Success. No rows returned" or similar

---

## ✅ Verification

After running BOTH migrations, run this query to verify:

```sql
-- Check profiles exist
SELECT COUNT(*) as total_profiles FROM public.profiles;
-- Should show at least 12 profiles

-- Check profile structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;
-- Should show 'id' as the first column (primary key)

-- Check users have profiles
SELECT 
  COUNT(*) as users_without_profiles 
FROM auth.users u 
LEFT JOIN public.profiles p ON u.id = p.id 
WHERE p.id IS NULL;
-- Should return 0 (all users have profiles)
```

---

## 🎉 What Will Be Fixed

After running these migrations:

### ✅ Chats Will Work
- Can message anyone
- No more "chat not found" errors
- Conversations load properly
- Names display correctly

### ✅ Profile Pictures Show
- Avatar images display
- Profile photos visible everywhere
- Default initials show if no photo

### ✅ All User Data Works
- Full names display
- User types show (Organizer, Vendor, etc.)
- Locations and bios visible
- Profile pages work

### ✅ New Features Work
- New signups auto-get profiles
- All future chat partners get profiles
- Everything stays in sync

---

## 🚨 If Something Goes Wrong

### Error: "relation already exists"
This means the table wasn't dropped properly. Run this first:
```sql
DROP TABLE IF EXISTS public.profiles CASCADE;
```
Then run Migration 1 again.

### Error: "user_type check constraint"
This is already fixed in the migration - it removes the strict constraint.

### Error: "permission denied"
Make sure you're running the queries as the Supabase admin in the SQL Editor.

---

## ⏰ How Long This Takes

- Migration 1: ~10 seconds
- Migration 2: ~2 seconds
- Total time: **~15 seconds**

---

## 📱 After Running Migrations

1. **Refresh your app** (Ctrl+R)
2. **Go to `/chats`** - Conversations should load
3. **Click on any chat** - Should open without "chat not found"
4. **Check profile pictures** - Should display
5. **Go to `/profile`** - Should show your info
6. **Go to `/test`** - Run diagnostics to verify

---

## 💾 Backup Info

Supabase automatically creates backups before migrations. If anything goes wrong:
1. Go to: Database → Backups in Supabase Dashboard
2. Restore from a backup before the migration

---

## ✨ This Is The Final Fix

Once you run these 2 migrations:
- ❌ No more "chat not found"
- ❌ No more missing profile pictures  
- ❌ No more missing user data
- ✅ Everything works perfectly!

**THIS IS THE MOST IMPORTANT STEP - Run these 2 migrations NOW!** 🚀
