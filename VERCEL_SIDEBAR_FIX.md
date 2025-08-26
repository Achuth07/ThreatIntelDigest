# Vercel Sidebar Loading Issue - Fix Guide

## Problem Description
The left sidebar is not loading properly on the deployed Vercel website, likely due to:
1. Missing RSS sources in the database
2. DATABASE_URL environment variable not configured
3. Database not initialized with default sources
4. CORS or API connectivity issues

## Quick Diagnosis

### Step 1: Test Your Deployment
Run the diagnostic script to identify the issue:

```bash
node scripts/diagnose-vercel-issue.js https://your-vercel-domain.vercel.app
```

Replace `your-vercel-domain.vercel.app` with your actual Vercel domain.

### Step 2: Check Vercel Environment Variables
1. Go to your Vercel dashboard
2. Navigate to your project settings
3. Go to "Environment Variables" tab
4. Ensure `DATABASE_URL` is set with your Neon database connection string

**Required Environment Variables:**
```
DATABASE_URL=postgresql://username:password@ep-xxx.neon.tech/dbname?sslmode=require
NODE_ENV=production
```

## Fix Solutions

### Solution 1: Initialize Database Sources
The most likely issue is that your database doesn't have any RSS sources. 

**Option A: Via API Call**
```bash
curl -X POST https://your-vercel-domain.vercel.app/api/initialize-sources
```

**Option B: Via Browser**
1. Open your browser developer tools (F12)
2. Go to Console tab
3. Run this JavaScript:
```javascript
fetch('/api/initialize-sources', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

### Solution 2: Check Database Connection
If the API calls are failing, verify your database connection:

1. **Check Database URL Format**:
   ```
   postgresql://username:password@ep-xxx.neon.tech/dbname?sslmode=require
   ```

2. **Test Database Connection** (locally):
   ```bash
   npm run db:push
   ```

### Solution 3: Manual Database Setup
If automatic initialization fails, you can manually add sources:

```sql
INSERT INTO rss_sources (name, url, icon, color, is_active) VALUES
  ('Bleeping Computer', 'https://www.bleepingcomputer.com/feed/', 'fas fa-exclamation', '#ef4444', true),
  ('The Hacker News', 'https://feeds.feedburner.com/TheHackersNews', 'fas fa-user-secret', '#f97316', true),
  ('Dark Reading', 'https://www.darkreading.com/rss_simple.asp', 'fas fa-eye', '#8b5cf6', true),
  ('CrowdStrike Blog', 'https://www.crowdstrike.com/blog/feed/', 'fas fa-crow', '#dc2626', true),
  ('Unit 42', 'https://unit42.paloaltonetworks.com/feed/', 'fas fa-shield-virus', '#2563eb', true),
  ('The DFIR Report', 'https://thedfirreport.com/feed/', 'fas fa-search', '#16a34a', true);
```

### Solution 4: Check Browser Console
1. Open your deployed website
2. Press F12 to open developer tools
3. Check the Console tab for errors
4. Check the Network tab to see if API calls are failing

Common errors to look for:
- CORS errors
- 404 errors on `/api/sources`
- Database connection errors
- Network timeout errors

## Debugging Steps

### 1. Test API Endpoints Directly
Visit these URLs in your browser:
- `https://your-domain.vercel.app/api/sources` - Should return JSON array
- `https://your-domain.vercel.app/api/articles` - Should return JSON array

### 2. Check Vercel Function Logs
1. Go to Vercel dashboard
2. Navigate to your project
3. Go to "Functions" tab
4. Check logs for any errors

### 3. Redeploy with Latest Changes
Sometimes a fresh deployment helps:
```bash
git add .
git commit -m "Fix sidebar loading issue"
git push origin main
```

## Expected Behavior
After fixing, the sidebar should:
1. Show "Threat Intel Sources" header with a plus (+) button
2. Display "All Sources" option
3. List individual RSS sources (Bleeping Computer, The Hacker News, etc.)
4. Show loading skeleton during data fetch
5. Handle errors gracefully

## Environment Variables Checklist
Ensure these are set in Vercel:

- [ ] `DATABASE_URL` - Your Neon PostgreSQL connection string
- [ ] `NODE_ENV` - Set to "production"
- [ ] Any custom CORS origins if needed

## Contact Support
If the issue persists after trying these solutions:
1. Check Vercel function logs for specific errors
2. Verify your Neon database is accessible
3. Test the same deployment locally with `npm run build && npm start`

## Post-Fix Verification
After implementing the fix:
1. ✅ Sidebar loads without errors
2. ✅ RSS sources are visible
3. ✅ Can add/remove sources
4. ✅ Articles load when selecting sources
5. ✅ No console errors in browser

Remember to test both the initial load and any user interactions to ensure everything works correctly.