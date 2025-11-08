# CyberFeed - Threat Intelligence Aggregator

A cybersecurity-focused RSS news aggregator that provides real-time threat intelligence and security news from multiple sources. Designed for security professionals to browse, search, filter, and bookmark security articles with threat level classification.

## 🎯 Project Overview

CyberFeed is a threat intelligence aggregation platform that enables security analysts and researchers to:

- **Aggregate** threat intelligence from multiple RSS sources into a unified interface
- **Monitor** CVE/vulnerability data from the National Vulnerability Database (NVD)
- **Manage** threat intelligence sources efficiently  
- **Bookmark** important articles for future reference
- **Filter** articles by threat level (Critical, High, Medium, Low)
- **Browse** CVE data with CVSS scoring and severity filtering
- **Search** through security news and threat intelligence
- **Stay updated** with the latest cybersecurity threats and developments
- **Authenticate** with Google OAuth for personalized experience
- **Customize** feed sources with user-specific preferences
- **Receive guidance** with interactive tooltips and onboarding assistance

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- Radix UI + shadcn/ui for accessible components
- TanStack React Query for state management and caching
- Wouter for lightweight client-side routing

**Backend:**
- Node.js with Express.js framework
- TypeScript with ES modules
- RESTful API design
- RSS-parser for feed processing
- Axios for HTTP requests

**Database:**
- PostgreSQL (Neon Serverless)
- Drizzle ORM for type-safe database operations
- Zod for schema validation and type safety
- CVE/vulnerability data storage and management

**Development Tools:**
- tsx for TypeScript execution and hot reloading
- Vite for frontend bundling
- esbuild for backend bundling
- ESLint and TypeScript for code quality

**Deployment Optimization:**
- Consolidated API architecture for Vercel serverless functions
- Database utilities consolidated into single endpoint with action-based routing
- Optimized for Vercel Hobby plan function limits (under 12 functions)

### Built-in RSS Sources

The application comes pre-configured with 25+ categorized cybersecurity news sources:

**Vendor & Private Threat Research:**
- **Google Mandiant Threat Intelligence** - Advanced threat research and analysis
- **Cisco Talos Intelligence** - Network security and threat intelligence
- **CrowdStrike Blog** - Endpoint security and threat hunting
- **Red Canary Blog** - Threat detection and security operations
- **Securelist (Kaspersky)** - Global threat research and analysis
- **ESET WeLiveSecurity** - Security research and threat intelligence
- **Trustwave SpiderLabs** - Web application and network security
- **FireEye Threat Research** - Advanced persistent threat analysis
- **McAfee Labs** - Malware research and threat intelligence
- **Symantec Security Response** - Enterprise security research
- **Flashpoint** - Business risk intelligence and threat analysis
- **Juniper Networks Threat Research** - Network security research and threat intelligence

**Government & Agency Alerts:**
- **CISA Alerts** - Official US cybersecurity advisories
- **FBI IC3** - Internet crime and fraud alerts
- **NCSC-UK** - UK national cybersecurity guidance

**Specialized & Malware Focus:**
- **Malwarebytes Labs** - Consumer and enterprise malware research
- **Recorded Future** - Threat intelligence and security analytics
- **ThreatPost** - Breaking cybersecurity news and analysis
- **Krebs on Security** - Independent security journalism

**General Security News:**
- **Bleeping Computer** - Latest cybersecurity news and threat reports
- **The Hacker News** - Breaking cybersecurity news and analysis
- **Dark Reading** - Enterprise security news and insights
- **SecurityWeek** - Information security news and analysis
- **InfoSecurity Magazine** - Global cybersecurity news coverage

**Legacy Sources:**
- **The DFIR Report** - Digital forensics and incident response

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or v20 recommended)
- **npm**, **yarn**, or **pnpm**
- **Git**
- **PostgreSQL** database (or Neon Serverless account)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd ThreatIntelDigest
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   
   Create a `.env` file in the root directory:
   ```env
   # Required: PostgreSQL Database URL for persistent storage
   DATABASE_URL=postgresql://username:password@localhost:5432/cyberfeed
   
   # Required: NVD API Key for CVE data fetching
   NVD_API_KEY=your-nvd-api-key-here
   
   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Production URLs (for OAuth callbacks)
   BACKEND_URL=https://your-domain.com
   FRONTEND_URL=https://your-domain.com
   ```

4. **Initialize the database (if using PostgreSQL):**
   ```bash
   npm run db:push
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**
   Navigate to `http://localhost:5000`

### First Run

1. **Authenticate:** Click "Sign In" to authenticate with Google OAuth
2. **Add RSS Sources:** Use the "Add RSS Source" dialog to select from categorized built-in cybersecurity RSS feeds
3. **Manage Sources:** Remove sources from sidebar by hovering and clicking minus icon - they can be re-added later
4. **Fetch Articles:** Click "Refresh All Feeds" to populate the application with latest articles
5. **Get CVE Data:** Navigate to the Vulnerabilities section and click refresh to fetch latest CVE data from NVD
6. **Explore:** Browse articles, filter by threat level, explore CVE data, and bookmark important intelligence

## 📁 Project Structure

```
ThreatIntelDigest/
├── api/                    # API route handlers
│   ├── articles.ts         # Articles API endpoints
│   ├── auth.ts             # Google OAuth authentication
│   ├── bookmarks.ts        # Bookmarks management
│   ├── fetch-feeds.ts      # RSS feed fetching logic
│   ├── fetch-cves.ts       # CVE data fetching from NVD API
│   ├── vulnerabilities.ts  # CVE/vulnerability data endpoints
│   ├── sources.ts          # RSS sources management
│   ├── user-management.ts  # User management and statistics
│   ├── user-source-preferences.ts # User-specific source preferences
│   ├── database.ts         # Database management utilities
│   └── index.ts            # API routes index
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── ui/         # shadcn/ui components
│   │   │   ├── sidebar.tsx # Main navigation sidebar with source management
│   │   │   ├── header.tsx  # Application header with authentication
│   │   │   ├── article-card.tsx # Article display component
│   │   │   ├── cve-list.tsx # CVE/vulnerability display component
│   │   │   ├── add-sources-dialog.tsx # Categorized RSS sources selector
│   │   │   └── article-viewer.tsx # Slide-in article reader
│   │   ├── pages/          # Application pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions and configurations
│   │   └── App.tsx         # Main application component
│   └── index.html          # HTML entry point
├── server/                 # Express.js backend
│   ├── auth/              # Google OAuth implementation
│   ├── db.ts              # Database connection setup
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Storage interface and in-memory implementation
│   ├── postgres-storage.ts # PostgreSQL storage implementation
│   └── vite.ts            # Vite development server setup
├── shared/                 # Shared TypeScript types and schemas
│   └── schema.ts          # Drizzle ORM schemas and Zod validation
├── package.json           # Dependencies and scripts
├── vite.config.ts         # Vite configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── drizzle.config.ts      # Drizzle ORM configuration
```

## 🛠️ Development Commands

```bash
# Start development server with hot reloading
npm run dev

# Type checking
npm run check

# Build for production
npm run build

# Start production server
npm start

# Push database schema changes
npm run db:push

# Validate deployment readiness (custom script)
npm run validate-deployment
```

## 🎨 Features

### Core Functionality
- **RSS Feed Aggregation:** Automatic fetching and parsing of cybersecurity RSS feeds
- **CVE/Vulnerability Management:** Integration with National Vulnerability Database (NVD) API
- **Article Management:** Browse, search, and filter security articles
- **Threat Level Classification:** Automatic categorization (Critical, High, Medium, Low)
- **CVSS Scoring:** Display CVE data with CVSS v2/v3 scores and severity levels
- **Bookmarking System:** Save important articles for future reference
- **Real-time Updates:** Manual refresh with planned automatic scheduling
- **Source Management:** Add, deactivate, and reactivate RSS sources without data loss
- **User Authentication:** Secure Google OAuth 2.0 authentication
- **User Preferences:** Personalized source selection and management
- **Onboarding Assistance:** Interactive tooltips and guidance for new users

### Authentication & User Management
- **Google OAuth 2.0:** Secure authentication with Google accounts
- **User-Specific Preferences:** Personalized feed sources and settings
- **Session Management:** Secure session handling with token refresh
- **Admin Dashboard:** User statistics and management interface

### Source Management Features
- **Non-Destructive Removal:** Deactivate sources instead of permanent deletion
- **Easy Reactivation:** Deactivated sources can be re-added from built-in sources list
- **Hover Controls:** Minus icon appears on hover for quick source removal
- **Categorized Sources:** Organized by vendor, government, malware focus, and general news
- **Smart Duplicate Prevention:** Prevents adding the same source multiple times
- **User-Specific Sources:** Each user can customize their own feed sources

### User Interface
- **Dark Theme:** Optimized for security professionals
- **Responsive Design:** Mobile-first approach with breakpoint-based layouts
- **Accessibility:** Full keyboard navigation and screen reader support
- **Modern Components:** Built with Radix UI primitives for accessibility
- **Interactive Guidance:** Onboarding tooltips and callout boxes
- **Animated Transitions:** Smooth animations for enhanced user experience

### RSS Source Management
- **Categorized Selection:** Choose from organized categories of cybersecurity sources
- **One-Click Adding:** Simple interface to add trusted RSS feeds
- **Non-Destructive Removal:** Deactivate sources with hover minus icon
- **Smart Reactivation:** Previously added sources can be reactivated without data loss
- **Duplicate Prevention:** Only shows sources not currently active
- **User Preferences:** Each user can manage their own source preferences

## 🔧 Configuration

### Database Setup

The application supports two storage modes:

1. **In-Memory Storage (Default):** No database required, data resets on restart
2. **PostgreSQL Storage:** Persistent data with full database features

To use PostgreSQL, set the `DATABASE_URL` environment variable:

```env
DATABASE_URL=postgresql://username:password@host:port/database
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `NVD_API_KEY` | National Vulnerability Database API key | - | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | - | Yes |
| `BACKEND_URL` | Backend production URL | - | Yes (Production) |
| `FRONTEND_URL` | Frontend production URL | - | Yes (Production) |
| `PORT` | Server port | `5000` | No |
| `NODE_ENV` | Environment mode | `development` | No |

## 🚦 API Endpoints

### Articles
- `GET /api/articles` - Fetch articles with filtering options
- `POST /api/articles` - Create new article

### CVE/Vulnerabilities
- `GET /api/vulnerabilities` - Fetch CVE data with filtering and pagination
- `POST /api/fetch-cves` - Fetch latest CVE data from NVD API

### RSS Sources  
- `GET /api/sources` - Get all RSS sources
- `POST /api/sources` - Add new RSS source
- `PATCH /api/sources/:id` - Update RSS source (activate/deactivate)
- `DELETE /api/sources/:id` - Permanently delete RSS source

### Bookmarks
- `GET /api/bookmarks` - Get user bookmarks
- `POST /api/bookmarks` - Create bookmark
- `DELETE /api/bookmarks/:articleId` - Remove bookmark

### User Management
- `GET /api/user-management` - Get all users
- `GET /api/user-management?stats=true` - Get user statistics

### User Source Preferences
- `GET /api/user-source-preferences` - Get user's source preferences
- `POST /api/user-source-preferences` - Update user's source preferences

### Authentication
- `GET /api/auth?action=google` - Initiate Google OAuth flow
- `GET /api/auth?action=callback` - Google OAuth callback
- `GET /api/auth?action=logout` - Logout current user
- `GET /api/auth?action=status` - Check authentication status

### Feed Management
- `POST /api/fetch-feeds` - Manually refresh all RSS feeds
- `POST /api/fetch-article` - Extract full article content from URL

### Database Management
- `GET /api/database?action=check` - Check database connectivity
- `POST /api/database?action=init` - Initialize database schema
- `GET /api/database?action=ping` - API health check
- `GET /api/database?action=test` - Basic database test
- `GET /api/database?action=test-steps` - Detailed database test
- `POST /api/database?action=initialize-sources` - Initialize default RSS sources

## 🔒 Security Features

- **Input Validation:** Zod schema validation for all API inputs
- **Type Safety:** Full TypeScript coverage across frontend and backend
- **SQL Injection Prevention:** Drizzle ORM with parameterized queries
- **Secure Sessions:** Express-session with PostgreSQL storage (when configured)
- **Google OAuth 2.0:** Secure authentication with Google accounts
- **JWT Tokens:** Secure token-based authentication with refresh mechanism
- **HTTPS Enforcement:** Automatic redirect to HTTPS in production

## 🎯 Recent Enhancements

### Authentication System
- **Google OAuth 2.0 Integration:** Secure authentication with Google accounts
- **User Session Management:** Automatic token refresh and session handling
- **User-Specific Data:** Personalized bookmarks and source preferences
- **Admin Dashboard:** User statistics and management interface

### User Experience Improvements
- **Interactive Onboarding:** Tooltips and guidance for new users
- **Animated Transitions:** Smooth animations for enhanced user experience
- **Responsive Design:** Optimized for all device sizes
- **Accessibility Features:** Full keyboard navigation and screen reader support

### Source Management
- **User-Specific Preferences:** Each user can customize their own feed sources
- **Non-Destructive Removal:** Sources can be deactivated and reactivated
- **Enhanced UI:** Improved source management interface with hover controls
- **Duplicate Prevention:** Smart logic to prevent adding duplicate sources

### Performance Optimizations
- **Consolidated API:** Reduced number of serverless functions for Vercel deployment
- **Database Optimization:** Efficient queries and indexing
- **Caching Strategy:** React Query for frontend data caching
- **Bundle Optimization:** ESBuild for efficient backend bundling

## 📈 Visitor Analytics

This project integrates with CounterAPI to track visitor statistics. The visitor count is displayed in the footer of the application.

### Setting up CounterAPI

1. **Create a CounterAPI account** at [https://counterapi.com](https://counterapi.com)
2. **Create a workspace** called `threatfeed`
3. **Create a counter** with these details:
   - Name: `visitors`
   - Slug: `visitorstothreatfeed`
   - Workspace: `threatfeed`
4. **Get your API token** from the CounterAPI dashboard
5. **Add the token to your Vercel environment variables**:
   - Variable name: `VITE_THREATFEED_COUNTER`
   - Value: Your CounterAPI token

The integration automatically increments the counter each time a user visits the site and displays the current count in the footer.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

**Server won't start:**
- Ensure Node.js v18+ is installed
- Check if port 5000 is available
- Verify all dependencies are installed (`npm install`)

**Database connection errors:**
- Verify `DATABASE_URL` is correctly formatted
- Ensure PostgreSQL server is running (if using local database)
- Check database credentials and permissions

**RSS feeds not loading:**
- Check internet connectivity
- Verify RSS source URLs are accessible
- Some feeds may have rate limiting or require specific user agents

**CVE data not loading:**
- Verify NVD_API_KEY is set correctly in environment variables
- Check internet connectivity to National Vulnerability Database
- Run database initialization: `POST /api/database?action=init`
- Manually fetch CVE data: `POST /api/fetch-cves`
- Check database connectivity: `GET /api/database?action=check`
- Run detailed database tests: `GET /api/database?action=test-steps`

**Authentication issues:**
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set correctly
- Check BACKEND_URL and FRONTEND_URL for production environments
- Ensure OAuth callback URLs are registered in Google Cloud Console
- Check browser console for authentication errors

**macOS-specific issues:**
- The application is configured to use `localhost` instead of `0.0.0.0` for macOS compatibility

## 📞 Support

For support and questions:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review the project documentation

---

**Built with ❤️ for the cybersecurity community**