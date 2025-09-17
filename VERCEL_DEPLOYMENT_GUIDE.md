# Vercel Deployment Guide for Chyme

## Environment Variables Required on Vercel

Set these environment variables in your Vercel dashboard:

1. **VITE_SUPABASE_URL** (Optional - has fallback)
   - Value: `https://behddityjbiumdcgattw.supabase.co`

2. **VITE_SUPABASE_ANON_KEY** (Optional - has fallback)
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlaGRkaXR5amJpdW1kY2dhdHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4Mzg0NDQsImV4cCI6MjA3MzQxNDQ0NH0.NG9I7gbKhdsGL_UzB5fbgtuiFseu8-3QZ3usbNDge08`

## Deployment Steps

1. **Connect Repository**: Connect your GitHub repository to Vercel
2. **Framework Preset**: Select "Vite" as the framework
3. **Build Settings**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. **Environment Variables**: Add the variables listed above
5. **Deploy**: Click deploy

## Configuration Files

- `vercel.json`: Contains deployment configuration
- `vite.config.ts`: Contains build configuration
- `package.json`: Contains build scripts

## Troubleshooting

If the site shows blank:
1. Check browser console for errors
2. Verify environment variables are set
3. Check Vercel build logs
4. Ensure all dependencies are in `package.json`

## Build Output

The build creates a `dist` folder with:
- `index.html` - Main HTML file
- `assets/` - CSS and JavaScript bundles
- Static assets (favicon, manifest, etc.)
