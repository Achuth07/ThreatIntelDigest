# CyberFeed - RSS Security News Aggregator

## Overview

CyberFeed is a cybersecurity-focused RSS news aggregator that provides real-time threat intelligence and security news from multiple sources. The application allows users to browse, search, filter, and bookmark security articles with threat level classification. It features a modern dark theme UI optimized for security professionals who need to stay updated on the latest cybersecurity threats and developments.

The application includes advanced source management with non-destructive deactivation/reactivation functionality, allowing users to temporarily remove sources from their sidebar while preserving the ability to re-add them later. RSS sources are organized into categories (Vendor & Private Threat Research, Government & Agency Alerts, Specialized & Malware Focus, General Security News) for better discoverability.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite for fast development and building
- **UI Library**: Radix UI components with shadcn/ui design system for accessible, customizable components
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API endpoints for articles, bookmarks, and RSS sources
- **RSS Processing**: rss-parser library for fetching and parsing RSS feeds
- **HTTP Client**: Axios for external API requests
- **Development**: tsx for TypeScript execution and hot reloading

### Data Storage Solutions
- **Database**: PostgreSQL using Neon serverless database
- **ORM**: Drizzle ORM for type-safe database operations and migrations
- **Schema**: Shared TypeScript schema definitions between client and server
- **Validation**: Zod schemas for runtime type validation and API contract enforcement
- **Fallback**: In-memory storage implementation for development/testing

### Database Schema Design
- **Articles**: Stores news articles with metadata (title, summary, URL, source, threat level, tags, read time)
- **Bookmarks**: User bookmarks linking to articles with timestamps
- **RSS Sources**: Configuration for RSS feeds (name, URL, icon, color, active status) with support for deactivation/reactivation
- **Relationships**: Foreign key constraints between bookmarks and articles
- **Source Management**: Non-destructive operations using isActive field for source lifecycle management

### Authentication and Authorization
- **Current State**: No authentication system implemented (planned for future)
- **Session Management**: connect-pg-simple for PostgreSQL session storage (prepared)
- **Architecture**: Designed to support user-based bookmarks and preferences

### UI/UX Design Patterns
- **Component Architecture**: Atomic design with reusable UI components
- **Theme System**: Dark theme optimized for security professionals with cyber-themed colors
- **Responsive Design**: Mobile-first approach with breakpoint-based layouts
- **Accessibility**: Full keyboard navigation and screen reader support via Radix UI
- **Loading States**: Skeleton components and loading indicators for better UX
- **Source Management UI**: Hover-based controls with minus icons for non-destructive source removal
- **Categorized Dialogs**: Tabbed interfaces for organized source selection and management

### RSS Feed Integration
- **Sources**: 25+ categorized cybersecurity news sources organized by type (Vendor Research, Government Alerts, Malware Focus, General News)
- **Processing**: Automatic feed fetching with parsing and content extraction
- **Content Classification**: Threat level assignment (Critical, High, Medium, Low)
- **Scheduling**: Manual refresh with planned automatic scheduling
- **Error Handling**: Graceful degradation when feeds are unavailable
- **Source Management**: Non-destructive deactivation/reactivation with hover controls
- **Smart Reactivation**: Previously added sources can be reactivated without creating duplicates

### Development Tools and Configuration
- **Build System**: Vite with React plugin and TypeScript support
- **Code Quality**: ESLint and TypeScript strict mode for code consistency
- **Development Experience**: Hot module replacement and error overlays
- **Path Aliases**: Organized imports with @ prefixes for clean code structure
- **Environment**: Replit-optimized with development banner and cartographer integration

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **DATABASE_URL**: Environment variable for database connection string

### RSS Data Sources
- **Vendor & Private Threat Research**: Google Mandiant, Cisco Talos, CrowdStrike, Red Canary, Kaspersky, ESET, Trustwave, FireEye, McAfee, Symantec
- **Government & Agency Alerts**: CISA Alerts, FBI IC3, NCSC-UK
- **Specialized & Malware Focus**: Malwarebytes Labs, Recorded Future, ThreatPost, Krebs on Security
- **General Security News**: Bleeping Computer, The Hacker News, Dark Reading, SecurityWeek, InfoSecurity Magazine
- **Legacy Sources**: The DFIR Report

### UI Component Libraries
- **Radix UI**: Headless UI components for accessibility and customization
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component library based on Radix UI

### Development and Build Tools
- **Vite**: Fast build tool and development server
- **PostCSS**: CSS processing with Tailwind CSS and Autoprefixer
- **TypeScript**: Static type checking and enhanced developer experience
- **TanStack React Query**: Data fetching and caching solution

### Runtime Dependencies
- **Express.js**: Web application framework for API routes
- **Drizzle Kit**: Database migration and introspection tools
- **rss-parser**: RSS feed parsing and content extraction
- **date-fns**: Date manipulation and formatting utilities