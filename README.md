# CyberFeed - Threat Intelligence Aggregator

A cybersecurity-focused RSS news aggregator that provides real-time threat intelligence and security news from multiple sources. Designed for security professionals to browse, search, filter, and bookmark security articles with threat level classification.

## 🎯 Project Overview

CyberFeed is a threat intelligence aggregation platform that enables security analysts and researchers to:

- **Aggregate** threat intelligence from multiple RSS sources into a unified interface
- **Monitor** and manage threat intelligence sources efficiently  
- **Bookmark** important articles for future reference
- **Filter** articles by threat level (Critical, High, Medium, Low)
- **Search** through security news and threat intelligence
- **Stay updated** with the latest cybersecurity threats and developments

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

**Development Tools:**
- tsx for TypeScript execution and hot reloading
- Vite for frontend bundling
- esbuild for backend bundling
- ESLint and TypeScript for code quality

### Built-in RSS Sources

The application comes pre-configured with major cybersecurity news sources:

- **Bleeping Computer** - Latest cybersecurity news and threat reports
- **The Hacker News** - Breaking cybersecurity news and analysis  
- **Dark Reading** - Enterprise security news and insights
- **CrowdStrike Blog** - Threat intelligence and security research
- **Palo Alto Unit 42** - Advanced threat research and analysis
- **DFIR Report** - Digital forensics and incident response
- **Flashpoint** - Threat intelligence and security research

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
   
   Create a `.env` file in the root directory (optional - app works with in-memory storage):
   ```env
   # Optional: PostgreSQL Database URL for persistent storage
   DATABASE_URL=postgresql://username:password@localhost:5432/cyberfeed
   
   # Server Configuration
   PORT=5000
   NODE_ENV=development
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

1. **Add RSS Sources:** Use the built-in sources dropdown in the left sidebar to quickly add pre-configured cybersecurity RSS feeds
2. **Fetch Articles:** Click "Refresh All Feeds" to populate the application with latest articles
3. **Explore:** Browse articles, filter by threat level, and bookmark important intelligence

## 📁 Project Structure

```
ThreatIntelDigest/
├── api/                    # API route handlers
│   ├── articles.ts         # Articles API endpoints
│   ├── bookmarks.ts        # Bookmarks management
│   ├── fetch-feeds.ts      # RSS feed fetching logic
│   ├── sources.ts          # RSS sources management
│   └── index.ts            # API routes index
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── ui/         # shadcn/ui components
│   │   │   ├── sidebar.tsx # Main navigation sidebar
│   │   │   ├── article-card.tsx # Article display component
│   │   │   └── built-in-sources-dropdown.tsx # RSS sources selector
│   │   ├── pages/          # Application pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions and configurations
│   │   └── App.tsx         # Main application component
│   └── index.html          # HTML entry point
├── server/                 # Express.js backend
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
```

## 🎨 Features

### Core Functionality
- **RSS Feed Aggregation:** Automatic fetching and parsing of cybersecurity RSS feeds
- **Article Management:** Browse, search, and filter security articles
- **Threat Level Classification:** Automatic categorization (Critical, High, Medium, Low)
- **Bookmarking System:** Save important articles for future reference
- **Real-time Updates:** Manual refresh with planned automatic scheduling

### User Interface
- **Dark Theme:** Optimized for security professionals
- **Responsive Design:** Mobile-first approach with breakpoint-based layouts
- **Accessibility:** Full keyboard navigation and screen reader support
- **Modern Components:** Built with Radix UI primitives for accessibility

### Built-in Sources Management
- **Quick Setup:** Dropdown to select from pre-configured cybersecurity sources
- **One-Click Adding:** Simple interface to add trusted RSS feeds
- **Smart Filtering:** Only shows sources not yet added to avoid duplicates

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
| `DATABASE_URL` | PostgreSQL connection string | - | No |
| `PORT` | Server port | `5000` | No |
| `NODE_ENV` | Environment mode | `development` | No |

## 🚦 API Endpoints

### Articles
- `GET /api/articles` - Fetch articles with filtering options
- `POST /api/articles` - Create new article

### RSS Sources  
- `GET /api/sources` - Get all RSS sources
- `POST /api/sources` - Add new RSS source

### Bookmarks
- `GET /api/bookmarks` - Get user bookmarks
- `POST /api/bookmarks` - Create bookmark
- `DELETE /api/bookmarks/:articleId` - Remove bookmark

### Feed Management
- `POST /api/fetch-feeds` - Manually refresh all RSS feeds

## 🔒 Security Features

- **Input Validation:** Zod schema validation for all API inputs
- **Type Safety:** Full TypeScript coverage across frontend and backend
- **SQL Injection Prevention:** Drizzle ORM with parameterized queries
- **Secure Sessions:** Express-session with PostgreSQL storage (when configured)

## 🎯 Future Enhancements

- **Authentication System:** User accounts and personalized bookmarks
- **Automatic Feed Refresh:** Scheduled RSS feed updates
- **Advanced Filtering:** Custom filters and saved searches
- **Export Functionality:** Export bookmarks and articles
- **API Documentation:** OpenAPI/Swagger integration
- **Testing Suite:** Comprehensive test coverage

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

**macOS-specific issues:**
- The application is configured to use `localhost` instead of `0.0.0.0` for macOS compatibility

## 📞 Support

For support and questions:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review the project documentation

---

**Built with ❤️ for the cybersecurity community**