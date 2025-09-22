# CVE Integration Troubleshooting Guide

## 🚨 Common Issues & Solutions

### 1. CVE Data Not Loading
**Symptoms:**
- Empty CVE list in sidebar
- "No CVE data available" messages
- Loading spinners that never complete

**Quick Checks:**
- ✅ Verify `NVD_API_KEY` is set in environment variables
- ✅ Check if `/api/fetch-cves` endpoint returns success
- ✅ Confirm database connectivity with `/api/database?action=check`

### 2. Database Connection Issues
**Symptoms:**
- 500 errors on CVE-related endpoints
- "Database connection failed" messages
- Slow or unresponsive CVE loading

**Diagnostic Steps:**
1. Verify `DATABASE_URL` environment variable is correctly set
2. Check database credentials and connectivity
3. Run the database check: `/api/database?action=check`
4. If needed, initialize database schema: `/api/database?action=init`

### 3. NVD API Quota Issues
**Symptoms:**
- "Rate limit exceeded" errors
- Intermittent CVE loading failures
- 429 HTTP status codes in logs

**Solutions:**
- Monitor API usage through NVD developer portal
- Implement caching to reduce API calls
- Consider upgrading to a higher-tier NVD API key if available

## 🔧 Diagnostic Endpoints

### Available Diagnostic Tools
- `GET /api/database?action=check` - Database connectivity and table status
- `GET /api/database?action=test` - Basic database connection test
- `GET /api/database?action=test-steps` - Detailed step-by-step database test
- `GET /api/fetch-cves` - Manual CVE fetch trigger (POST for actual fetch)
- `GET /api/vulnerabilities` - Retrieve current CVE data with filtering

### Diagnostic Process
1. Check environment variables in Vercel dashboard
2. Run the database check endpoint: `/api/database?action=check`
3. If tables are missing, initialize database: `/api/database?action=init`
4. Test CVE fetching: POST to `/api/fetch-cves`
5. Verify data retrieval: GET from `/api/vulnerabilities`

## 🛠️ Manual Testing

### Direct API Testing
```bash
# Test database connectivity
curl https://your-app.vercel.app/api/database?action=check

# Test database connection
curl https://your-app.vercel.app/api/database?action=test

# Initialize database (if needed)
curl -X POST https://your-app.vercel.app/api/database?action=init

# Fetch CVEs manually
curl -X POST https://your-app.vercel.app/api/fetch-cves

# Check current CVE data
curl https://your-app.vercel.app/api/vulnerabilities
```

## 📊 Expected Behavior

### Successful Responses
- Database check returns connection status and table information
- CVE fetch returns success message with count of processed records
- Vulnerabilities endpoint returns CVE data with proper pagination

### Error Patterns
- 500 errors usually indicate database or NVD API issues
- 401/403 errors suggest missing or invalid API keys
- 429 errors indicate rate limiting from NVD API

## 🔐 Security Notes

- Never expose API keys in client-side code
- Use environment variables for all sensitive configuration
- Monitor NVD API usage to avoid quota exhaustion
- Regularly rotate API keys through NVD developer portal

## 📞 Support Resources

- [NVD API Documentation](https://nvd.nist.gov/developers)
- [NVD API Key Management](https://nvd.nist.gov/developers/request-an-api-key)
- [Project GitHub Issues](https://github.com/your-repo/issues)