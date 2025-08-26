# Vercel Deployment Guide for ThreatIntelDigest

## 🚀 Quick Deployment Steps

### 1. Vercel Dashboard Configuration

**Build & Development Settings:**
```
Framework Preset: Other
Build Command: npm run build
Output Directory: dist/public
Install Command: npm install
Development Command: npm run dev
Node.js Version: 18.x (recommended)
```

### 2. Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

#### Required Variables
```bash
# Database (Required)
DATABASE_URL=postgresql://username:password@host/database?sslmode=require

# Application Environment
NODE_ENV=production

# Session Security (Generate a secure random string)
SESSION_SECRET=your-32-character-random-secret-key
```

#### Optional Variables
```bash
# RSS Configuration
RSS_USER_AGENT=ThreatIntelDigest/1.0
RSS_TIMEOUT=10000

# CORS Configuration
CORS_ORIGIN=https://your-app.vercel.app
```

### 3. Database Setup (Neon PostgreSQL)

1. **Create Neon Database:**
   - Go to [Neon Console](https://console.neon.tech)
   - Create new project
   - Copy connection string

2. **Initialize Schema:**
   ```bash
   # After deployment, run once:
   npx drizzle-kit push:pg
   ```

### 4. Deployment Process

#### Option A: GitHub Integration (Recommended)
1. Push code to GitHub repository
2. Connect repository in Vercel dashboard
3. Configure build settings (see above)
4. Add environment variables
5. Deploy

#### Option B: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel login
vercel --prod
```

## 🔧 Vercel Configuration Details

### Build Settings Explanation

| Setting | Value | Reason |
|---------|-------|---------|
| **Framework** | Other | Custom full-stack setup |
| **Build Command** | `npm run build` | Builds both frontend (Vite) and backend (esbuild) |
| **Output Directory** | `dist/public` | Vite builds frontend to this location |
| **Install Command** | `npm install` | Standard npm dependency installation |
| **Node.js Version** | 18.x | Required for ES modules and latest features |

### File Structure After Build
```
dist/
├── public/          # Frontend build (Vite output)
│   ├── index.html
│   ├── assets/
│   └── ...
├── index.js         # Backend build (esbuild output)
└── ...
```

### API Routes Configuration

The `vercel.json` configuration handles:
- **API Routes:** `/api/*` → Vercel Functions
- **Frontend:** All other routes → `index.html` (SPA routing)
- **CORS:** Proper headers for API endpoints

## 🛠️ Pre-Deployment Checklist

### Code Preparation
- [ ] All TypeScript compilation errors resolved
- [ ] Build command works locally (`npm run build`)
- [ ] Environment variables template created
- [ ] Database schema ready for deployment

### Database Setup
- [ ] Neon PostgreSQL database created
- [ ] Connection string obtained
- [ ] Database URL added to Vercel environment variables

### Security Configuration
- [ ] SESSION_SECRET generated (32+ characters)
- [ ] CORS_ORIGIN set to your domain
- [ ] No sensitive data in code repository

### Vercel Configuration
- [ ] `vercel.json` file added
- [ ] Build settings configured
- [ ] Environment variables added
- [ ] Node.js version set to 18.x

## 🔍 Troubleshooting

### Common Issues & Solutions

#### Build Failures
```bash
# Issue: "Cannot find package '@replit/vite-plugin-*'" 
# Solution: Replit plugins conditionally loaded (already fixed)
npm run build  # Test locally first

# Issue: "vite: command not found" or "esbuild: command not found"
# Solution: Build tools moved to dependencies (already fixed)
npm run build  # Test locally first

# Issue: TypeScript compilation errors
# Solution: Run locally first
npm run check
npm run build

# Issue: Missing dependencies
# Solution: Ensure all deps in package.json
npm install --production
```

#### Database Connection Issues
```bash
# Issue: Database connection fails
# Solutions:
1. Verify DATABASE_URL format
2. Check Neon database is active
3. Ensure SSL mode is required
4. Test connection locally
```

#### Function Runtime Issues
```bash
# Issue: "Function Runtimes must have a valid version"
# Solutions:
1. Use simplified vercel.json (current configuration)
2. Or specify exact runtime version: "@vercel/node@18"
3. Ensure API files have default exports
4. Check Node.js version compatibility

# Alternative approach if issues persist:
# Rename vercel.json to vercel-backup.json
# Copy vercel-alternative.json to vercel.json
```

#### API Route Issues
```bash
# Issue: API routes return 404
# Solutions:
1. Verify vercel.json configuration
2. Check API file structure in /api/*
3. Ensure @vercel/node runtime is used
```

#### Environment Variables
```bash
# Issue: Environment variables not loading
# Solutions:
1. Check variable names match exactly
2. Ensure they're set for production environment
3. Redeploy after adding variables
```

### Performance Optimization

#### Recommended Settings
```bash
# Build optimization
NODE_OPTIONS=--max_old_space_size=4096

# Function timeout (if needed)
VERCEL_FUNCTION_TIMEOUT=30

# Edge configuration
VERCEL_REGION=us-east-1
```

#### Monitoring
- Enable Vercel Analytics
- Set up error tracking
- Monitor function execution times
- Check database connection pooling

## 🎯 Post-Deployment Steps

1. **Verify Deployment:**
   - Test frontend loads correctly
   - Verify API endpoints work
   - Check database connectivity

2. **Initialize Data:**
   ```bash
   # Run database migrations (if needed)
   npx drizzle-kit push:pg
   
   # Add initial RSS sources (automatic on first run)
   ```

3. **Test Functionality:**
   - Add RSS sources
   - Fetch articles
   - Test bookmarking
   - Verify source management

4. **Configure Domain (Optional):**
   - Add custom domain in Vercel dashboard
   - Update CORS_ORIGIN environment variable

## 📊 Expected Deployment Times

- **Initial Build:** 2-4 minutes
- **Subsequent Builds:** 1-2 minutes
- **Cold Start:** < 1 second
- **API Response:** < 500ms

## 🔐 Security Notes

- Always use HTTPS in production
- Keep SESSION_SECRET secure and random
- Use environment variables for sensitive data
- Enable Vercel's security headers
- Monitor for unusual API usage

## 📞 Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Neon Database Docs](https://neon.tech/docs)
- [Project GitHub Issues](https://github.com/your-repo/issues)

---

**Ready to deploy! 🚀**

Follow this guide step-by-step for a successful Vercel deployment of your ThreatIntelDigest application.