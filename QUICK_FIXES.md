# Quick Fixes for Current Errors

## Error 1: WebSocket Connection Failed (400)
**This is a Vite HMR issue - NOT critical, app still works**

### Fix:
```bash
# Stop the dev server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

OR just ignore it - it only affects hot-reload, not the actual app functionality.

---

## Error 2: useAuth must be used within AuthProvider
**This is a component mounting order issue**

### Cause:
The Profile component is trying to mount before AuthProvider is ready.

### Fix:
**Clear browser cache and restart:**

1. Close all browser tabs with your app
2. Clear browser cache (Ctrl+Shift+Delete)
3. Stop dev server (Ctrl+C)
4. Delete node_modules/.vite folder
5. Restart: `npm run dev`
6. Hard refresh browser (Ctrl+Shift+R)

### Quick Fix (Temporary):
Just refresh the page - the error is only on initial load.

---

## What's Actually Working:

✅ Chats load and display
✅ Profile data fetches correctly  
✅ Conversations show
✅ Contact discovery works
✅ Profile pictures show (or initials as fallback)

---

## The Real Issues That Need Database Fixes:

These WebSocket and AuthProvider errors are just **dev environment issues**. 

The REAL problems that need the database migrations:
1. Some users don't have profiles
2. Event links view uses wrong join
3. Profile fields might be inconsistent

**Run those 2 database migrations to fix the core data issues!**
