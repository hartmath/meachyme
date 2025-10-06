# Supabase Setup Guide

## Current Issue
Your Supabase project appears to be inaccessible (404 error). This is likely because:
1. The project has been paused due to inactivity
2. There's a billing issue
3. The project URL has changed

## Solution: Create New Supabase Project

### Step 1: Create New Project
1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - Name: `chyme-app` (or any name you prefer)
   - Database Password: Create a strong password
   - Region: Choose closest to your location

### Step 2: Get Your New Credentials
1. In your new project dashboard, go to Settings → API
2. Copy the following values:
   - Project URL
   - Anon/Public Key

### Step 3: Update Your App Configuration
Create a `.env.local` file in your project root with:

```env
VITE_SUPABASE_URL=your_new_project_url_here
VITE_SUPABASE_ANON_KEY=your_new_anon_key_here
```

### Step 4: Update Database Schema
You'll need to run your database migrations on the new project. The migrations are in your `supabase/migrations/` folder.

### Step 5: Test Connection
1. Restart your development server: `npm run dev`
2. Go to `/auth` and use the Authentication Debugger
3. Click "Run Diagnostics" to verify the connection

## Alternative: Check Existing Project
If you want to keep using the existing project:
1. Check your Supabase dashboard for any paused projects
2. Look for billing notifications
3. Contact Supabase support if the project should be active

## Quick Test
After updating your credentials, the debugger should show:
- ✅ Network connectivity
- ✅ Supabase configuration
- ✅ Auth endpoint working
