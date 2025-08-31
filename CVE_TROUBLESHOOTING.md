# CVE Loading Issue - Troubleshooting Guide

## Issue Description
CVEs are fetching successfully from NVD API but not loading in the frontend. Error message: "Failed to load vulnerabilities"

## Step-by-Step Diagnosis

### Step 1: Database Diagnosis
Run the comprehensive database diagnostic:
```
GET https://your-app.vercel.app/api/diagnose-db
```

This will check:
- ✅ Database connectivity
- ✅ Table existence (vulnerabilities table)
- ✅ Record counts
- ✅ Environment variables
- ✅ Sample data inspection

### Step 2: Check Environment Variables in Vercel
Ensure these are set in Vercel Dashboard → Settings → Environment Variables:
- `DATABASE_URL` - Your Neon PostgreSQL connection string
- `NVD_API_KEY` - Your NVD API key (UUID format)
- `NODE_ENV` - Set to "production"

### Step 3: Initialize Database Schema (if needed)
If vulnerabilities table doesn't exist:
```
POST https://your-app.vercel.app/api/database?action=init
```

### Step 4: Test Vulnerabilities API Directly
Check the API endpoint directly:
```
GET https://your-app.vercel.app/api/vulnerabilities
```

Expected responses:
- ✅ **Success**: Returns vulnerabilities array with pagination
- ⚠️  **Empty**: Returns empty array with message about running CVE fetch
- ❌ **Error**: Returns detailed error information

### Step 5: Fetch CVE Data (if table is empty)
If no CVE data exists:
```
POST https://your-app.vercel.app/api/fetch-cves
```

This will:
- Fetch CVEs from NVD API (last 7 days)
- Store them in PostgreSQL
- Return status and count

### Step 6: Check Frontend Network Requests
Open browser DevTools → Network tab and look for:
- `/api/vulnerabilities` request
- Status code and response
- Any CORS or network errors

## Common Issues and Solutions

### Issue 1: "vulnerabilities table does not exist"
**Solution**: Run database initialization
```bash
curl -X POST https://your-app.vercel.app/api/database?action=init
```

### Issue 2: "No vulnerabilities found"
**Solution**: Fetch CVE data
```bash
curl -X POST https://your-app.vercel.app/api/fetch-cves
```

### Issue 3: "DATABASE_URL environment variable is required"
**Solution**: Set DATABASE_URL in Vercel environment variables

### Issue 4: "NVD_API_KEY environment variable is required"
**Solution**: Set NVD_API_KEY in Vercel environment variables

### Issue 5: Frontend shows "Failed to load vulnerabilities"
**Possible Causes**:
1. API returning 500 error
2. Network connectivity issue
3. CORS configuration problem
4. Frontend making request to wrong endpoint

**Debug Steps**:
1. Check browser console for detailed error
2. Test API endpoint directly in browser
3. Check Network tab for failed requests

## Environment Variable Requirements

According to your memory, ensure these are set in Vercel:

```
DATABASE_URL=postgresql://username:password@host.com/database
NVD_API_KEY=your-uuid-api-key-here
NODE_ENV=production
SESSION_SECRET=your-32-char-session-secret
CORS_ORIGIN=https://your-app.vercel.app
```

## API Endpoint Reference

### Database Management
- `GET /api/database?action=check` - Check database connectivity
- `POST /api/database?action=init` - Initialize database schema
- `GET /api/database?action=ping` - Health check

### CVE Management
- `GET /api/vulnerabilities` - Get vulnerabilities (with pagination)
- `POST /api/fetch-cves` - Fetch CVEs from NVD API
- `GET /api/diagnose-db` - Comprehensive database diagnosis

### Usage Examples

```bash
# Check if database is working
curl https://your-app.vercel.app/api/database?action=check

# Initialize database (create tables)
curl -X POST https://your-app.vercel.app/api/database?action=init

# Get comprehensive diagnosis
curl https://your-app.vercel.app/api/diagnose-db

# Fetch CVE data from NVD
curl -X POST https://your-app.vercel.app/api/fetch-cves

# Get vulnerabilities (what frontend calls)
curl https://your-app.vercel.app/api/vulnerabilities
```

## Expected Data Flow

1. **Database Initialization**: Creates vulnerabilities table
2. **CVE Fetch**: Retrieves data from NVD API → Stores in PostgreSQL
3. **Frontend Request**: Calls `/api/vulnerabilities` → Returns data from PostgreSQL
4. **Frontend Display**: Shows CVEs in the UI

## Troubleshooting Checklist

- [ ] Environment variables are set in Vercel
- [ ] Database connectivity test passes
- [ ] vulnerabilities table exists
- [ ] CVE data has been fetched and stored
- [ ] `/api/vulnerabilities` endpoint returns data
- [ ] Frontend network requests are successful
- [ ] No CORS or authentication errors

## Next Steps

1. Deploy the updated code with improved error logging
2. Run the diagnostic endpoint: `/api/diagnose-db`
3. Based on the results, follow the appropriate solution above
4. Test the vulnerabilities endpoint directly
5. Check frontend console for any additional errors

The enhanced error logging will now provide much more detailed information about what's failing in the process.