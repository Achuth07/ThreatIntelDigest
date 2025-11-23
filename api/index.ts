import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from 'drizzle-orm';

// Consolidated API handler that handles all endpoints through action-based routing
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
  const action = req.query.action as string || '';

  console.log(`API Request: ${req.method} ${pathname} with action: ${action}`);

  // Handle different API endpoints based on pathname and action
  try {
    // Auth endpoints - handle email auth separately from Google OAuth
    if (pathname.startsWith('/api/auth/email')) {
      return handleEmailAuthEndpoints(req, res);
    }

    if (pathname.startsWith('/api/auth')) {
      return handleAuthEndpoints(req, res, action);
    }

    // Sources endpoints
    if (pathname.startsWith('/api/sources')) {
      return handleSourcesEndpoints(req, res, action);
    }

    // Articles endpoints
    if (pathname.startsWith('/api/articles')) {
      return handleArticlesEndpoints(req, res, action);
    }

    // Bookmarks endpoints
    if (pathname.startsWith('/api/bookmarks')) {
      return handleBookmarksEndpoints(req, res, action);
    }

    // User management endpoints
    if (pathname.startsWith('/api/user-management')) {
      return handleUserManagementEndpoints(req, res, action);
    }

    // User onboarding endpoints
    if (pathname.startsWith('/api/user/onboarding')) {
      return handleUserOnboardingEndpoints(req, res, action);
    }

    // User source preferences endpoints
    if (pathname.startsWith('/api/user-source-preferences')) {
      return handleUserSourcePreferencesEndpoints(req, res, action);
    }

    // User preferences endpoints
    if (pathname.startsWith('/api/user-preferences')) {
      return handleUserPreferencesEndpoints(req, res, action);
    }

    // Visitor count endpoints
    if (pathname.startsWith('/api/visitor-count')) {
      return handleVisitorCountEndpoints(req, res, action);
    }

    // Vulnerabilities endpoints
    if (pathname.startsWith('/api/vulnerabilities')) {
      return handleVulnerabilitiesEndpoints(req, res, action);
    }

    // Fetch CVEs endpoints
    if (pathname.startsWith('/api/fetch-cves')) {
      return handleFetchCvesEndpoints(req, res, action);
    }

    // Fetch feeds endpoints
    if (pathname.startsWith('/api/fetch-feeds')) {
      return handleFetchFeedsEndpoints(req, res, action);
    }

    // Fetch article endpoints
    if (pathname.startsWith('/api/fetch-article')) {
      return handleFetchArticleEndpoints(req, res, action);
    }

    // Database endpoints
    if (pathname.startsWith('/api/database')) {
      return handleDatabaseEndpoints(req, res, action);
    }

    // Default 404 response
    res.status(404).json({ message: 'API endpoint not found' });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// In-memory storage for local development
let inMemorySources: any[] = [
  {
    id: '1',
    name: 'Bleeping Computer',
    url: 'https://www.bleepingcomputer.com/feed/',
    icon: 'fas fa-exclamation',
    color: '#ef4444',
    isActive: true,
    lastFetched: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Microsoft Security Blog',
    url: 'https://www.microsoft.com/en-us/security/blog/feed/',
    icon: 'fas fa-microsoft',
    color: '#00bcf2',
    isActive: true,
    lastFetched: new Date().toISOString()
  },
  {
    id: '3',
    name: 'The DFIR Report',
    url: 'https://thedfirreport.com/feed/',
    icon: 'fas fa-file-alt',
    color: '#8b5cf6',
    isActive: true,
    lastFetched: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Palo Alto Unit 42',
    url: 'https://unit42.paloaltonetworks.com/feed/',
    icon: 'fas fa-shield-alt',
    color: '#f97316',
    isActive: true,
    lastFetched: new Date().toISOString()
  },
  {
    id: '5',
    name: 'The Hacker News',
    url: 'https://feeds.feedburner.com/TheHackersNews',
    icon: 'fas fa-user-secret',
    color: '#ef4444',
    isActive: true,
    lastFetched: new Date().toISOString()
  }
];

// In-memory storage for user source preferences (local development)
let inMemoryUserPreferences: any[] = [];



// Helper function to get user ID from request
function getUserIdFromRequest(req: any): number | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const payload = verifyToken(token);

  if (!payload || !payload.userId) {
    return null;
  }

  return payload.userId;
}

import { pgTable, serial, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';
import { boolean as pgBoolean, integer, jsonb } from 'drizzle-orm/pg-core';

// Define the users table schema directly
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  googleId: varchar('google_id', { length: 255 }).unique(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  avatar: text('avatar'),
  passwordHash: text('password_hash'),
  emailVerified: pgBoolean('email_verified').default(false),
  verificationToken: text('verification_token'),
  verificationTokenExpiry: timestamp('verification_token_expiry'),
  resetToken: text('reset_token'),
  resetTokenExpiry: timestamp('reset_token_expiry'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at').defaultNow().notNull(),
  role: text('role'),
  topics: jsonb('topics').$type<string[]>().default([]),
  hasOnboarded: pgBoolean('has_onboarded').default(false),
});

// Define the user_preferences table schema directly
const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  displayName: text('display_name'),
  watchlistKeywords: text('watchlist_keywords'),
  autoExtractIOCs: pgBoolean('auto_extract_iocs').default(true),
  autoEnrichIOCs: pgBoolean('auto_enrich_iocs').default(false),
  hiddenIOCTypes: jsonb('hidden_ioc_types').$type<string[]>().default([]),
  emailWeeklyDigest: pgBoolean('email_weekly_digest').default(false),
  emailWatchlistAlerts: pgBoolean('email_watchlist_alerts').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Admin email from environment variable
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'achuthchandra07@gmail.com'; // Fallback for development only

// Simple interface for user tracking data
interface UserLoginRecord {
  id: number;
  googleId: string | null;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: Date;
  lastLoginAt: Date;
  hasOnboarded: boolean;
}

/**
 * Get database connection
 * @returns Database connection
 */
async function getDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Import modules dynamically to avoid module loading issues
  const { drizzle } = await import('drizzle-orm/neon-serverless');
  const { Pool } = await import('@neondatabase/serverless');

  const pool = new Pool({ connectionString });
  return drizzle(pool);
}

/**
 * Initialize the users table if it doesn't exist
 */
async function initializeUsersTable() {
  const db = await getDb();

  try {
    // Check if table exists by attempting to query it
    await db.execute(sql`SELECT 1 FROM users LIMIT 1`);
  } catch (error) {
    // If table doesn't exist, create it
    if (error instanceof Error && error.message.includes('relation "users" does not exist')) {
      console.log('Creating users table...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          google_id VARCHAR(255) UNIQUE NOT NULL,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          avatar TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          last_login_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);
      console.log('Users table created successfully');
    } else {
      throw error;
    }
  }
}

/**
 * Get or create a user record in the database
 * @param googleId Google user ID
 * @param name User's name
 * @param email User's email
 * @param avatar User's avatar URL
 * @returns User record
 */
async function getOrCreateUser(googleId: string, name: string, email: string, avatar: string | null): Promise<UserLoginRecord> {
  const db = await getDb();

  try {
    // Try to find existing user
    const existingUsers = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      // Update last login time
      const updatedUsers = await db.update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, existingUser.id))
        .returning();

      const updatedUser = updatedUsers[0];
      return {
        id: updatedUser.id,
        googleId: updatedUser.googleId,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar || null,
        createdAt: updatedUser.createdAt,
        lastLoginAt: updatedUser.lastLoginAt,
        hasOnboarded: updatedUser.hasOnboarded || false,
      };
    } else {
      // Create new user
      const newUsers = await db.insert(users).values({
        googleId,
        name,
        email,
        avatar: avatar || null,
      }).returning();

      const newUser = newUsers[0];
      return {
        id: newUser.id,
        googleId: newUser.googleId,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar || null,
        createdAt: newUser.createdAt,
        lastLoginAt: newUser.lastLoginAt,
        hasOnboarded: false,
      };
    }
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw error;
  }
}

/**
 * Generate a secure JWT token
 * @param payload Data to include in the token
 * @returns Token string
 */
function generateToken(payload: any): string {
  const secret = process.env.SESSION_SECRET || 'fallback_secret_key_for_development_only';
  const header = { alg: 'HS256', typ: 'JWT' };

  // Add issued at time and ensure expiration is a number
  const fullPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000) // 24 hours in seconds
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64').replace(/=/g, '');
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64').replace(/=/g, '');

  // Create signature using HMAC-SHA256
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify a token with enhanced security checks
 * @param token Token to verify
 * @returns Decoded payload or null if invalid
 */
function verifyToken(token: string): any | null {
  try {
    // Basic format check
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const secret = process.env.SESSION_SECRET || 'fallback_secret_key_for_development_only';

    // Verify signature using timing-safe comparison
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '');

    // Use timingSafeEqual to prevent timing attacks
    try {
      const expectedSigBuffer = Buffer.from(expectedSignature);
      const actualSigBuffer = Buffer.from(signature);

      // Ensure buffers are same length for timingSafeEqual
      if (expectedSigBuffer.length !== actualSigBuffer.length) {
        return null;
      }

      if (!crypto.timingSafeEqual(expectedSigBuffer, actualSigBuffer)) {
        return null;
      }
    } catch (e) {
      return null;
    }

    // Decode payload
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString());

    // Check if token has expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && currentTime > payload.exp) {
      return null;
    }

    // Check if issued at time is in the future (prevents future tokens)
    if (payload.iat && payload.iat > currentTime + 60) { // Allow 1 minute clock skew
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

async function handleGoogleCallback(req: VercelRequest, res: VercelResponse) {
  const { code } = req.query;

  // Determine the redirect URI based on environment
  // Use VERCAL_ENV for Vercel deployments, fallback to NODE_ENV
  const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  const backendUrl = isProduction ? 'https://www.whatcyber.com' : 'http://localhost:5001';
  const frontendUrl = isProduction ? 'https://www.whatcyber.com/threatfeed' : 'http://localhost:5173/threatfeed';
  const redirectUri = `${backendUrl}/api/auth?action=callback`;

  console.log('Environment Detection:');
  console.log('  VERCEL_ENV:', process.env.VERCEL_ENV);
  console.log('  NODE_ENV:', process.env.NODE_ENV);
  console.log('  Is Production:', isProduction);

  console.log('Google Callback - Environment:', process.env.NODE_ENV);
  console.log('Google Callback - Is Production:', isProduction);
  console.log('Google Callback - Backend URL:', backendUrl);
  console.log('Google Callback - Frontend URL:', frontendUrl);
  console.log('Google Callback - Redirect URI:', redirectUri);
  console.log('Google Callback - Received Code:', !!code);

  if (!code) {
    // If there's no code, redirect to the frontend with an error
    console.log('Google Callback - No code received, redirecting with error');
    res.redirect(`${frontendUrl}?error=authentication_failed`);
    return;
  }

  try {
    // Initialize users table if it doesn't exist
    await initializeUsersTable();

    // Exchange the code for an access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();

    // Get user profile information
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      throw new Error(`Profile fetch failed: ${profileResponse.status}`);
    }

    const profile = await profileResponse.json();

    // Save user to database using our tracking utility
    const user = await getOrCreateUser(
      profile.id,
      profile.name,
      profile.email,
      profile.picture
    );

    // Generate authentication token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.email === ADMIN_EMAIL,
      exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    };

    const token = generateToken(tokenPayload);

    // Prepare user data for frontend
    const userData = {
      id: user.id,
      googleId: user.googleId,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isAdmin: user.email === ADMIN_EMAIL,
      hasOnboarded: user.hasOnboarded,
      token: token
    };

    // Redirect to frontend with user data (URL encoded)
    const userDataString = encodeURIComponent(JSON.stringify(userData));
    const redirectUrl = `${frontendUrl}?user=${userDataString}`;
    console.log('Google Callback - Redirecting with user data');
    console.log('Google Callback - Redirect URL:', redirectUrl);
    console.log('Google Callback - User data:', JSON.stringify(userData));
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Authentication error:', error);
    console.log('Google Callback - Redirecting with error');
    res.redirect(`${frontendUrl}?error=authentication_failed`);
  }
}

async function handleGoogleLogin(req: VercelRequest, res: VercelResponse) {
  // Determine the redirect URI based on environment
  // Use VERCAL_ENV for Vercel deployments, fallback to NODE_ENV
  const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  const backendUrl = isProduction ? 'https://www.whatcyber.com' : 'http://localhost:5001';
  const redirectUri = `${backendUrl}/api/auth?action=callback`;

  console.log('Google Login - Environment Detection:');
  console.log('  VERCEL_ENV:', process.env.VERCEL_ENV);
  console.log('  NODE_ENV:', process.env.NODE_ENV);
  console.log('  Is Production:', isProduction);
  console.log('  Backend URL:', backendUrl);
  console.log('  Redirect URI:', redirectUri);

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID || ''}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&scope=openid%20email%20profile` +
    `&access_type=offline`;

  console.log('Google Login - Final Auth URL:', googleAuthUrl);
  res.redirect(googleAuthUrl);
}


// Handler for checking authentication status
async function handleAuthStatus(req: VercelRequest, res: VercelResponse) {
  // Since we're using localStorage for authentication data in the frontend,
  // we can't actually check a server-side session state in this simple implementation.
  // In a real implementation, we would check the session or JWT here.
  res.status(200).json({
    isAuthenticated: false,
    message: 'Authentication status should be checked via localStorage in the frontend. This endpoint is not used in the current implementation.'
  });
}

// Handler for logging out
async function handleLogout(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    message: 'Logged out successfully. User data is cleared from localStorage.'
  });
}

async function handleEmailAuthEndpoints(req: VercelRequest, res: VercelResponse) {
  const { pathname } = new URL(req.url!, `https://${req.headers.host}`);

  // Check if database is configured
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({
      error: 'Database not configured',
      message: 'EMAIL authentication requires PostgreSQL database'
    });
  }

  // Dynamically import dependencies
  const { drizzle } = await import('drizzle-orm/neon-serverless');
  const { Pool } = await import('@neondatabase/serverless');
  const { PostgresStorage } = await import('../server/postgres-storage.js');
  const {
    hashPassword,
    verifyPassword,
    generateSecureToken,
    validatePasswordStrength
  } = await import('../server/auth/password-utils.js');
  const {
    sendVerificationEmail,
    sendPasswordResetEmail
  } = await import('../server/email-service.js');
  const { users: usersTable } = await import('../shared/schema.js');
  const { eq } = await import('drizzle-orm');

  // Create database connection and storage
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  const storage = new PostgresStorage();

  // Determine environment for URL construction
  const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  const baseUrl = isProduction ? 'https://www.whatcyber.com/threatfeed' : 'http://localhost:5173';

  // POST /api/auth/email/login - Login with email/password
  if ((pathname === '/api/auth/email/login' || pathname === '/api/auth/email/login/') && req.method === 'POST') {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        // Don't reveal if user exists
        return res.status(401).json({ message: 'Email or password is wrong' });
      }

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Email or password is wrong' });
      }

      // Temporarily disable email verification requirement
      // Check if email is verified
      // if (!user.emailVerified) {
      //   return res.status(403).json({ 
      //     error: 'Email not verified',
      //     message: 'Please verify your email before logging in. Check your inbox for the verification link.' 
      //   });
      // }

      // Update last login
      await db.update(usersTable)
        .set({ lastLoginAt: new Date() })
        .where(eq(usersTable.id, user.id));

      // Generate JWT token
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.email === ADMIN_EMAIL,
      };
      const token = generateToken(tokenPayload);

      return res.status(200).json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          isAdmin: user.email === ADMIN_EMAIL,
          hasOnboarded: user.hasOnboarded || false,
        }
      });

    } catch (error) {
      console.error('Email Login Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /api/auth/email/register - Register a new account with email/password
  if ((pathname === '/api/auth/email/register' || pathname === '/api/auth/email/register/') && req.method === 'POST') {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      if (!validatePasswordStrength(password)) {
        return res.status(400).json({
          error: 'Password too weak',
          message: 'Password must be at least 8 characters long, and contain uppercase letters, numbers and symbols'
        });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'Email already exists', message: 'Please use another email to create a new account or use "login instead". Also consider clearing cache before doing a password recovery or resetting credentials for already signed in email id if password changed before re-check' });
      }

      const passwordHash = await hashPassword(password);

      // Create user with email already verified for auto-login
      const newUser = await storage.createEmailUser({
        name,
        email,
        passwordHash,
        verificationToken: null,
        verificationTokenExpiry: null,
      });

      // Auto-verify the user during registration
      await storage.verifyUserEmail(newUser.id);

      // Generate JWT token for immediate login
      const tokenPayload = {
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        isAdmin: newUser.email === ADMIN_EMAIL,
      };
      const token = generateToken(tokenPayload);

      return res.status(200).json({
        message: 'Registration successful. Welcome to WhatCyber ThreatFeed!',
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          avatar: newUser.avatar,
          isAdmin: newUser.email === ADMIN_EMAIL,
          hasOnboarded: false,
        }
      });

    } catch (error) {
      console.error('Email Registration Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /api/auth/email/verify - Verify email with token
  if ((pathname === '/api/auth/email/verify' || pathname === '/api/auth/email/verify/') && req.method === 'POST') {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Verification token is required' });
      }

      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(404).json({ error: 'Invalid verification token' });
      }

      await db.update(usersTable)
        .set({ emailVerified: true })
        .where(eq(usersTable.id, user.id));

      return res.status(200).json({ message: 'Email verified successfully. Please log in to continue.' });

    } catch (error) {
      console.error('Email Verification Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /api/auth/email/forgot-password - Request password reset
  if ((pathname === '/api/auth/email/forgot-password' || pathname === '/api/auth/email/forgot-password/') && req.method === 'POST') {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: 'Email not found' });
      }

      // Generate password reset token
      const resetToken = generateSecureToken();
      await db.update(usersTable)
        .set({ resetToken })
        .where(eq(usersTable.id, user.id));

      // Send password reset email
      await sendPasswordResetEmail(user.email, user.name, resetToken);

      return res.status(200).json({ message: 'Password reset email sent. Please check your inbox to reset your password.' });

    } catch (error) {
      console.error('Password Reset Request Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /api/auth/email/reset-password - Reset password with token
  if ((pathname === '/api/auth/email/reset-password' || pathname === '/api/auth/email/reset-password/') && req.method === 'POST') {
    try {
      const { token, password, passwordConfirm } = req.body;

      if (!token || !password || !passwordConfirm) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      if (password !== passwordConfirm) {
        return res.status(400).json({ error: 'Passwords do not match' });
      }

      if (!validatePasswordStrength(password)) {
        return res.status(400).json({
          error: 'Password too weak',
          message: 'Password must be at least 8 characters long, and contain uppercase letters, numbers and symbols'
        });
      }

      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(404).json({ error: 'Invalid reset token' });
      }

      const passwordHash = await hashPassword(password);
      await db.update(usersTable)
        .set({ passwordHash })
        .where(eq(usersTable.id, user.id));

      return res.status(200).json({ message: 'Password reset successfully. Please log in with your new password.' });

    } catch (error) {
      console.error('Password Reset Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Handler for email verification
  if ((pathname === '/api/auth/email/verify' || pathname === '/api/auth/email/verify/') && req.method === 'GET') {
    try {
      const token = req.query.token as string;

      if (!token) {
        // Redirect to login with error
        const loginUrl = isProduction
          ? 'https://www.whatcyber.com/threatfeed/login?error=missing_token'
          : 'http://localhost:5173/login?error=missing_token';
        return res.redirect(302, loginUrl);
      }

      // Find user by verification token (also checks expiry)
      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        // Redirect to login with error
        const loginUrl = isProduction
          ? 'https://www.whatcyber.com/threatfeed/login?error=invalid_token'
          : 'http://localhost:5173/login?error=invalid_token';
        return res.redirect(302, loginUrl);
      }

      // Verify the user's email
      await storage.verifyUserEmail(user.id);

      // Redirect to login with success message
      const loginUrl = isProduction
        ? 'https://www.whatcyber.com/threatfeed/login?verified=true'
        : 'http://localhost:5173/login?verified=true';
      return res.redirect(302, loginUrl);
    } catch (error) {
      console.error('Email verification error:', error);
      // Redirect to login with error
      const loginUrl = isProduction
        ? 'https://www.whatcyber.com/threatfeed/login?error=verification_failed'
        : 'http://localhost:5173/login?error=verification_failed';
      return res.redirect(302, loginUrl);
    }
  }

  // POST /api/auth/email/forgot-password - Request password reset
  if ((pathname === '/api/auth/email/forgot-password' || pathname === '/api/auth/email/forgot-password/') && req.method === 'POST') {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);

      // Always return success to prevent email enumeration
      if (!user || !user.passwordHash) {
        return res.status(200).json({
          message: 'If an account with this email exists, a password reset link has been sent.'
        });
      }

      // Generate reset token (expires in 1 hour)
      const resetToken = generateSecureToken();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

      // Save reset token
      await storage.setResetToken(user.id, resetToken, resetTokenExpiry);

      // Send password reset email
      await sendPasswordResetEmail(email, user.name, resetToken);

      return res.status(200).json({
        message: 'If an account with this email exists, a password reset link has been sent.'
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      return res.status(500).json({ error: 'Password reset request failed' });
    }
  }

  // POST /api/auth/email/reset-password - Reset password with token
  if ((pathname === '/api/auth/email/reset-password' || pathname === '/api/auth/email/reset-password/') && req.method === 'POST') {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ error: 'Token and new password are required' });
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          error: 'Password does not meet requirements',
          message: passwordValidation.message
        });
      }

      // Find user by reset token (also checks expiry)
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      // Hash new password
      const passwordHash = await hashPassword(password);

      // Update password and clear reset token
      await storage.updateUserPassword(user.id, passwordHash);
      await storage.clearResetToken(user.id);

      return res.status(200).json({
        message: 'Password reset successfully! You can now log in with your new password.'
      });
    } catch (error) {
      console.error('Password reset error:', error);
      return res.status(500).json({ error: 'Password reset failed' });
    }
  }

  // POST /api/auth/email/set-password - Allow authenticated users to set/change password
  if ((pathname === '/api/auth/email/set-password' || pathname === '/api/auth/email/set-password/') && req.method === 'POST') {
    try {
      // Get user ID from JWT token
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { currentPassword, newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({ error: 'New password is required' });
      }

      // Validate new password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          error: 'Password does not meet requirements',
          message: passwordValidation.message
        });
      }

      // Get user from database
      const { users: usersTable } = await import('../shared/schema.js');
      const { eq } = await import('drizzle-orm');
      const userResult = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

      if (!userResult || userResult.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResult[0];

      // If user already has a password, verify the current password
      if (user.passwordHash) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Current password is required' });
        }

        const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
        if (!isCurrentPasswordValid) {
          return res.status(401).json({ error: 'Current password is incorrect' });
        }
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await storage.updateUserPassword(userId, newPasswordHash);

      // If this is a Google OAuth user setting their first password, mark email as verified
      if (user.googleId && !user.passwordHash) {
        await storage.verifyUserEmail(userId);
      }

      return res.status(200).json({
        message: user.passwordHash
          ? 'Password changed successfully!'
          : 'Password set successfully! You can now log in with your email and password.'
      });
    } catch (error) {
      console.error('Set password error:', error);
      return res.status(500).json({ error: 'Failed to set password' });
    }
  }

  // POST /api/auth/email/register - Register new user with email/password
  if ((pathname === '/api/auth/email/register' || pathname === '/api/auth/email/register/') && req.method === 'POST') {
    try {
      const { name, email, password } = req.body;

      // Validate input
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      // Validate email format

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          error: 'Password does not meet requirements',
          message: passwordValidation.message
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        // Don't reveal if user exists (prevent email enumeration)
        return res.status(200).json({
          message: 'If this email is not already registered, you will receive a verification email shortly.'
        });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Generate verification token (expires in 24 hours)
      const verificationToken = generateSecureToken();
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Create user
      const user = await storage.createEmailUser({
        name,
        email,
        passwordHash,
        verificationToken,
        verificationTokenExpiry
      });

      console.log('✅ User created successfully, preparing to send verification email:', {
        email,
        name,
        userId: user?.id,
        hasToken: !!verificationToken
      });

      // Send verification email
      try {
        await sendVerificationEmail(email, name, verificationToken);
        console.log('✅ Verification email sent successfully for:', email);
      } catch (emailError) {
        console.error('❌ Failed to send verification email:', emailError);
        // Don't fail registration if email fails - user can request new verification email
      }

      return res.status(200).json({
        message: 'If this email is not already registered, you will receive a verification email shortly.'
      });
    } catch (error) {
      console.error('Register error:', error);
      return res.status(500).json({ error: 'Registration failed' });
    }
  }

  // If no route matched
  return res.status(404).json({ error: 'Email auth endpoint not found' });
}

async function handleAuthEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  // Check if required environment variables are set
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({
      error: 'Database not configured',
      message: 'DATABASE_URL environment variable is not set'
    });
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({
      error: 'Google OAuth not configured',
      message: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required'
    });
  }

  switch (action) {
    case 'google':
      return handleGoogleLogin(req, res);
    case 'callback':
      return handleGoogleCallback(req, res);
    case 'status':
      return handleAuthStatus(req, res);
    case 'logout':
      return handleLogout(req, res);
    default:
      res.status(400).json({ error: 'Invalid action parameter' });
  }
}

async function handleSourcesEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  try {
    console.log(`${req.method} /api/sources - Starting request`);

    // Use in-memory storage when no DATABASE_URL is provided
    if (!process.env.DATABASE_URL) {
      console.log('Using in-memory storage for sources');

      if (req.method === 'GET') {
        console.log('Fetching RSS sources from memory...');

        // Get user ID from request for user-specific sources
        const userId = getUserIdFromRequest(req);

        if (userId) {
          // For in-memory storage, we'll need to implement user preferences
          // This is a simplified implementation for development only
          const userPreferences = inMemoryUserPreferences.filter(p => p.userId === userId);

          const sources = inMemorySources.filter(source => source.isActive).map(source => {
            const userPref = userPreferences.find(p => p.sourceId === source.id);
            return {
              ...source,
              isActive: userPref ? userPref.isActive : true // Default to active if no preference
            };
          });

          console.log(`Successfully fetched ${sources.length} user-specific sources`);
          return res.json(sources);
        } else {
          // Fetch all active sources for unauthenticated users
          const sources = inMemorySources.filter(source => source.isActive);
          console.log(`Successfully fetched ${sources.length} sources`);
          return res.json(sources);
        }

      } else if (req.method === 'POST') {
        console.log('Creating new RSS source in memory...');
        const { name, url, icon, color, isActive = true } = req.body;

        if (!name || !url) {
          return res.status(400).json({ message: "Name and URL are required" });
        }

        const newSource = {
          id: String(inMemorySources.length + 1),
          name,
          url,
          icon: icon || null,
          color: color || null,
          isActive,
          lastFetched: new Date().toISOString()
        };

        inMemorySources.push(newSource);
        console.log('Successfully created RSS source:', newSource.id);
        return res.status(201).json(newSource);

      } else if (req.method === 'PATCH') {
        console.log('Updating RSS source in memory...');

        // Handle both path parameter and query parameter for source ID
        const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
        let sourceId = pathname.split('/').pop();

        // If no source ID in path, check query parameters
        if (!sourceId || sourceId === 'sources') {
          sourceId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
        }

        if (!sourceId) {
          return res.status(400).json({ message: "Source ID is required" });
        }

        const sourceIndex = inMemorySources.findIndex(source => source.id === sourceId);
        if (sourceIndex === -1) {
          return res.status(404).json({ message: "Source not found" });
        }

        const { isActive, name, url, icon, color } = req.body;

        // Update the source
        if (name !== undefined) inMemorySources[sourceIndex].name = name;
        if (url !== undefined) inMemorySources[sourceIndex].url = url;
        if (icon !== undefined) inMemorySources[sourceIndex].icon = icon;
        if (color !== undefined) inMemorySources[sourceIndex].color = color;
        if (isActive !== undefined) inMemorySources[sourceIndex].isActive = isActive;

        console.log('Successfully updated RSS source:', sourceId);
        return res.json(inMemorySources[sourceIndex]);

      } else if (req.method === 'DELETE') {
        console.log('Deleting RSS source from memory...');
        const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
        const sourceId = pathname.split('/').pop();

        if (!sourceId) {
          return res.status(400).json({ message: "Source ID is required" });
        }

        const sourceIndex = inMemorySources.findIndex(source => source.id === sourceId);
        if (sourceIndex === -1) {
          return res.status(404).json({ message: "Source not found" });
        }

        inMemorySources.splice(sourceIndex, 1);
        console.log('Successfully deleted RSS source:', sourceId);
        return res.status(204).send('');

      } else {
        return res.status(405).json({ message: 'Method not allowed' });
      }
    }

    // Import modules dynamically to avoid module loading issues
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql } = await import('drizzle-orm');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    if (req.method === 'GET') {
      console.log('Fetching RSS sources...');

      // Check if 'all' parameter is set to fetch all sources
      const fetchAll = req.query.all === 'true';

      // Get user ID from request for user-specific sources
      const userId = getUserIdFromRequest(req);

      if (fetchAll || !userId) {
        // Fetch all active sources (for unauthenticated users or when explicitly requested)
        const result = await db.execute(sql`
          SELECT id, name, url, icon, color, is_active, last_fetched
          FROM rss_sources 
          WHERE is_active = true
          ORDER BY name ASC
        `);

        const sources = result.rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          url: row.url,
          icon: row.icon,
          color: row.color,
          isActive: row.is_active,
          lastFetched: row.last_fetched
        }));

        console.log(`Successfully fetched ${sources.length} sources (all sources mode)`);
        res.json(sources);
      } else if (userId) {
        // First, check if user has any source preferences
        const prefsCheck = await db.execute(sql`
          SELECT COUNT(*) as count 
          FROM user_source_preferences 
          WHERE user_id = ${userId}
        `);

        const hasPreferences = (prefsCheck.rows[0] as any).count > 0;

        if (hasPreferences) {
          // User has preferences - show only their selected sources (where preference exists and is active)
          const result = await db.execute(sql`
            SELECT s.id, s.name, s.url, s.icon, s.color, s.is_active, s.last_fetched,
                   p.is_active as user_active
            FROM rss_sources s
            INNER JOIN user_source_preferences p ON s.id = p.source_id AND p.user_id = ${userId}
            WHERE s.is_active = true AND p.is_active = true
            ORDER BY s.name ASC
          `);

          const sources = result.rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            url: row.url,
            icon: row.icon,
            color: row.color,
            isActive: true, // All returned sources are active
            lastFetched: row.last_fetched
          }));

          console.log(`Successfully fetched ${sources.length} user-selected sources`);
          res.json(sources);
        } else {
          // User has no preferences yet - show all active sources
          const result = await db.execute(sql`
            SELECT s.id, s.name, s.url, s.icon, s.color, s.is_active, s.last_fetched
            FROM rss_sources s
            WHERE s.is_active = true
            ORDER BY s.name ASC
          `);

          const sources = result.rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            url: row.url,
            icon: row.icon,
            color: row.color,
            isActive: true,
            lastFetched: row.last_fetched
          }));

          console.log(`Successfully fetched ${sources.length} sources (no user preferences)`);
          res.json(sources);
        }
      }

    } else if (req.method === 'POST') {
      console.log('Creating new RSS source...');
      const { name, url, icon, color, isActive = true } = req.body;

      if (!name || !url) {
        return res.status(400).json({ message: "Name and URL are required" });
      }

      const result = await db.execute(sql`
        INSERT INTO rss_sources (name, url, icon, color, is_active) 
        VALUES (${name}, ${url}, ${icon || null}, ${color || null}, ${isActive})
        RETURNING id, name, url, icon, color, is_active, last_fetched
      `);

      const source = result.rows[0];
      console.log('Successfully created RSS source:', source.id);
      res.status(201).json({
        id: source.id,
        name: source.name,
        url: source.url,
        icon: source.icon,
        color: source.color,
        isActive: source.is_active,
        lastFetched: source.last_fetched
      });

    } else if (req.method === 'PATCH') {
      console.log('Updating RSS source...');

      // Handle both path parameter and query parameter for source ID
      // This fixes the Vercel routing issue where path parameters aren't always available
      const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
      let sourceId = pathname.split('/').pop();

      // If no source ID in path, check query parameters
      if (!sourceId || sourceId === 'sources') {
        sourceId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
      }

      if (!sourceId) {
        return res.status(400).json({ message: "Source ID is required" });
      }

      const { isActive, name, url, icon, color } = req.body;

      // For now, just handle isActive field (most common use case)
      if (isActive !== undefined) {
        const result = await db.execute(sql`
          UPDATE rss_sources 
          SET is_active = ${isActive}
          WHERE id = ${sourceId}
          RETURNING id, name, url, icon, color, is_active, last_fetched
        `);

        if (result.rows.length === 0) {
          return res.status(404).json({ message: "Source not found" });
        }

        const source = result.rows[0];
        console.log('Successfully updated RSS source:', sourceId);
        res.json({
          id: source.id,
          name: source.name,
          url: source.url,
          icon: source.icon,
          color: source.color,
          isActive: source.is_active,
          lastFetched: source.last_fetched
        });
      } else {
        return res.status(400).json({ message: "No valid fields to update" });
      }

    } else if (req.method === 'DELETE') {
      console.log('Deleting RSS source...');
      const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
      const sourceId = pathname.split('/').pop();

      if (!sourceId) {
        return res.status(400).json({ message: "Source ID is required" });
      }

      const result = await db.execute(sql`
        DELETE FROM rss_sources WHERE id = ${sourceId}
        RETURNING id
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Source not found" });
      }

      console.log('Successfully deleted RSS source:', sourceId);
      res.status(204).send('');

    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Fatal error in sources API:', error);
    res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : 'Unknown error',
      hasDbUrl: !!process.env.DATABASE_URL,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined
    });
  }
}

// In-memory storage for local development
let inMemoryArticles: any[] = [
  {
    id: '1',
    title: 'New Zero-Day Exploit Targets Popular Web Browsers',
    summary: 'Security researchers have discovered a critical zero-day vulnerability affecting major web browsers that could allow remote code execution.',
    url: 'https://example.com/article1',
    source: 'Bleeping Computer',
    threatLevel: 'HIGH',
    tags: ['browser', 'zero-day', 'exploit'],
    readTime: 5,
    publishedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: '2',
    title: 'Ransomware Group Claims Responsibility for Healthcare Data Breach',
    summary: 'A notorious ransomware gang has announced they breached a major healthcare provider and are demanding payment.',
    url: 'https://example.com/article2',
    source: 'The Hacker News',
    threatLevel: 'CRITICAL',
    tags: ['ransomware', 'healthcare', 'breach'],
    readTime: 8,
    publishedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    createdAt: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: '3',
    title: 'New Phishing Campaign Targets Financial Institutions',
    summary: 'Cybercriminals are using sophisticated techniques to bypass email security filters and target banking customers.',
    url: 'https://example.com/article3',
    source: 'Dark Reading',
    threatLevel: 'MEDIUM',
    tags: ['phishing', 'finance', 'email'],
    readTime: 4,
    publishedAt: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
    createdAt: new Date(Date.now() - 10800000).toISOString()
  }
];

async function handleArticlesEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  try {
    console.log(`${req.method} /api/articles - Starting request`);

    // Use in-memory storage when no DATABASE_URL is provided
    if (!process.env.DATABASE_URL) {
      console.log('Using in-memory storage for articles');

      if (req.method === 'GET') {
        console.log('Fetching articles from memory...');
        const { source, limit = '10', offset = '0', search, sortBy = 'newest' } = req.query;

        // Filter by source if provided
        let filteredArticles = [...inMemoryArticles];
        if (source && source !== 'all') {
          filteredArticles = filteredArticles.filter(article => article.source === source);
        }

        // Filter by search term if provided
        if (search) {
          const searchTerm = (search as string).toLowerCase();
          filteredArticles = filteredArticles.filter(article =>
            article.title.toLowerCase().includes(searchTerm) ||
            article.summary.toLowerCase().includes(searchTerm)
          );
        }

        // Sort articles
        if (sortBy === 'newest') {
          filteredArticles.sort((a, b) =>
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
          );
        } else if (sortBy === 'oldest') {
          filteredArticles.sort((a, b) =>
            new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
          );
        }

        // Apply pagination
        const limitNum = parseInt(limit as string);
        const offsetNum = parseInt(offset as string);
        const paginatedArticles = filteredArticles.slice(offsetNum, offsetNum + limitNum);

        console.log(`Successfully fetched ${paginatedArticles.length} articles`);
        return res.json(paginatedArticles);

      } else if (req.method === 'POST') {
        console.log('Creating new article in memory...');
        const { title, summary, url, source, threatLevel = 'LOW', tags = [], readTime = 1 } = req.body;

        if (!title || !url || !source) {
          return res.status(400).json({ message: "Title, URL, and source are required" });
        }

        const newArticle = {
          id: String(inMemoryArticles.length + 1),
          title,
          summary,
          url,
          source,
          threatLevel,
          tags,
          readTime,
          publishedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          isBookmarked: false
        };

        inMemoryArticles.push(newArticle);
        console.log('Successfully created article:', newArticle.id);
        return res.status(201).json(newArticle);

      } else {
        return res.status(405).json({ message: 'Method not allowed' });
      }
    }

    // Import modules dynamically
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql } = await import('drizzle-orm');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    if (req.method === 'GET') {
      console.log('Fetching articles...');
      const { source, source_ids, limit = '10', offset = '0', search, sortBy = 'newest' } = req.query;

      // Check if user is authenticated and get their source preferences
      const userId = getUserIdFromRequest(req);
      let userActiveSourceNames: string[] = [];
      let userHasAnyPreferences = false;

      if (userId) {
        console.log('User authenticated, fetching their active sources...');

        // First, check if user has ANY preferences at all
        const allPrefsResult = await db.execute(sql`
          SELECT COUNT(*) as count FROM user_source_preferences 
          WHERE user_id = ${userId}
        `);
        userHasAnyPreferences = (allPrefsResult.rows[0] as any).count > 0;
        console.log('User has preferences:', userHasAnyPreferences);

        if (userHasAnyPreferences) {
          // User has explicit preferences - get ONLY sources they have enabled
          const userPrefsResult = await db.execute(sql`
            SELECT rs.name 
            FROM rss_sources rs
            INNER JOIN user_source_preferences usp ON rs.id = usp.source_id
            WHERE rs.is_active = true
              AND usp.user_id = ${userId}
              AND usp.is_active = true
          `);
          userActiveSourceNames = userPrefsResult.rows.map((row: any) => row.name);
        } else {
          // User has no preferences yet - show all active sources
          const allSourcesResult = await db.execute(sql`
            SELECT name FROM rss_sources WHERE is_active = true
          `);
          userActiveSourceNames = allSourcesResult.rows.map((row: any) => row.name);
        }

        console.log('User active source names:', userActiveSourceNames);
      }

      // Build base query with LEFT JOIN to get source URL from rss_sources
      let baseQuery = sql`
        SELECT 
          a.id, a.title, a.summary, a.url, a.source, a.threat_level, a.tags, 
          a.read_time, a.published_at, a.created_at,
          rs.url as source_url
        FROM articles a
        LEFT JOIN rss_sources rs ON a.source = rs.name
      `;

      // Add WHERE conditions
      const conditions: any[] = [];

      if (source && source !== 'all') {
        // Specific source selected
        conditions.push(sql`source = ${source}`);
      } else if (source_ids) {
        // Filter by specific source IDs provided in query
        // IDs are UUID strings, so we just split and trim
        const ids = (source_ids as string).split(',').map(id => id.trim()).filter(id => id.length > 0);

        if (ids.length > 0) {
          // Get names for these IDs
          const namesResult = await db.execute(sql`
            SELECT name FROM rss_sources WHERE id IN (${sql.join(ids, sql`, `)})
          `);
          const names = namesResult.rows.map((row: any) => row.name);

          if (names.length > 0) {
            const inClause = names.map((name: string) => sql`${name}`).reduce((acc: any, curr: any, idx: number) =>
              idx === 0 ? curr : sql`${acc}, ${curr}`
            );
            conditions.push(sql`source IN (${inClause})`);
          } else {
            // IDs provided but no matching names found - return no results
            conditions.push(sql`1 = 0`);
          }
        }
      } else if (userId && userActiveSourceNames.length > 0) {
        // User is authenticated and has preferences - filter by active source names
        const inClause = userActiveSourceNames.map((name: string) => sql`${name}`).reduce((acc: any, curr: any, idx: number) =>
          idx === 0 ? curr : sql`${acc}, ${curr}`
        );
        conditions.push(sql`source IN (${inClause})`);
      } else if (userId && !userHasAnyPreferences) {
        // User is authenticated but has NO preferences (e.g. new user)
        // Show NO articles to encourage onboarding/following
        conditions.push(sql`1 = 0`);
      }
      // If no source filter and user has no preferences, show all articles

      if (search) {
        const searchTerm = `%${search}%`;
        conditions.push(sql`(title ILIKE ${searchTerm} OR summary ILIKE ${searchTerm})`);
      }

      // Combine conditions
      let query = baseQuery;
      if (conditions.length > 0) {
        query = sql`${baseQuery} WHERE ${sql.join(conditions, sql` AND `)}`;
      }

      // Add sorting
      if (sortBy === 'newest') {
        query = sql`${query} ORDER BY published_at DESC`;
      } else if (sortBy === 'oldest') {
        query = sql`${query} ORDER BY published_at ASC`;
      } else {
        query = sql`${query} ORDER BY created_at DESC`;
      }

      // Add pagination
      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      query = sql`${query} LIMIT ${limitNum} OFFSET ${offsetNum}`;

      const result = await db.execute(query);

      const articles = result.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        summary: row.summary,
        url: row.url,
        source: row.source,
        sourceUrl: row.source_url || null,
        threatLevel: row.threat_level,
        tags: row.tags || [],
        readTime: row.read_time,
        publishedAt: row.published_at,
        createdAt: row.created_at,
        isBookmarked: false // Simplified for now
      }));

      console.log(`Successfully fetched ${articles.length} articles`);
      res.json(articles);

    } else if (req.method === 'POST') {
      console.log('Creating new article...');
      const { title, summary, url, source, threatLevel = 'LOW', tags = [], readTime = 1 } = req.body;

      if (!title || !url || !source) {
        return res.status(400).json({ message: "Title, URL, and source are required" });
      }

      const publishedAt = new Date();

      const result = await db.execute(sql`
        INSERT INTO articles (title, summary, url, source, threat_level, tags, read_time, published_at)
        VALUES (${title}, ${summary}, ${url}, ${source}, ${threatLevel}, ${tags}, ${readTime}, ${publishedAt})
        RETURNING id, title, summary, url, source, threat_level, tags, read_time, published_at, created_at
      `);

      const article = result.rows[0];
      console.log('Successfully created article:', article.id);
      res.status(201).json({
        id: article.id,
        title: article.title,
        summary: article.summary,
        url: article.url,
        source: article.source,
        threatLevel: article.threat_level,
        tags: article.tags || [],
        readTime: article.read_time,
        publishedAt: article.published_at,
        createdAt: article.created_at,
        isBookmarked: false
      });

    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Fatal error in articles API:', error);
    res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : 'Unknown error',
      hasDbUrl: !!process.env.DATABASE_URL,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined
    });
  }
}

// In-memory storage for local development
let inMemoryBookmarks: any[] = [];

// Simplified bookmark storage implementation for Vercel
class SimpleBookmarkStorage {
  async getBookmarks(userId: number): Promise<any[]> {
    if (!process.env.DATABASE_URL) {
      // Return in-memory bookmarks filtered by userId
      return inMemoryBookmarks.filter(b => b.userId === userId);
    }

    // For Vercel, we'll need to import modules dynamically
    try {
      const { drizzle } = await import('drizzle-orm/neon-serverless');
      const { Pool } = await import('@neondatabase/serverless');
      const { sql } = await import('drizzle-orm');

      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const db = drizzle(pool);

      // Query bookmarks table
      const result = await db.execute(sql`
        SELECT id, article_id, user_id, created_at 
        FROM bookmarks 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `);

      return result.rows.map((row: any) => ({
        id: row.id,
        articleId: row.article_id,
        userId: row.user_id,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      return [];
    }
  }

  async getBookmarksWithArticles(userId: number): Promise<any[]> {
    if (!process.env.DATABASE_URL) {
      // For in-memory storage, we don't have articles, so return bookmarks only
      return inMemoryBookmarks.filter(b => b.userId === userId);
    }

    // For Vercel, we'll need to import modules dynamically
    try {
      const { drizzle } = await import('drizzle-orm/neon-serverless');
      const { Pool } = await import('@neondatabase/serverless');
      const { sql } = await import('drizzle-orm');

      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const db = drizzle(pool);

      // Query bookmarks with articles
      const result = await db.execute(sql`
        SELECT 
          b.id as bookmark_id,
          b.article_id,
          b.user_id,
          b.created_at as bookmark_created_at,
          a.id as article_id,
          a.title,
          a.summary,
          a.url,
          a.source,
          a.threat_level,
          a.tags,
          a.read_time,
          a.published_at,
          a.created_at as article_created_at,
          rs.url as source_url
        FROM bookmarks b
        INNER JOIN articles a ON b.article_id = a.id
        LEFT JOIN rss_sources rs ON a.source = rs.name
        WHERE b.user_id = ${userId}
        ORDER BY b.created_at DESC
      `);

      return result.rows.map((row: any) => ({
        bookmark: {
          id: row.bookmark_id,
          articleId: row.article_id,
          userId: row.user_id,
          createdAt: row.bookmark_created_at
        },
        article: {
          id: row.article_id,
          title: row.title,
          summary: row.summary,
          url: row.url,
          source: row.source,
          sourceUrl: row.source_url || null,
          threatLevel: row.threat_level,
          tags: row.tags || [],
          readTime: row.read_time,
          publishedAt: row.published_at,
          createdAt: row.article_created_at
        }
      }));
    } catch (error) {
      console.error('Error fetching bookmarks with articles:', error);
      return [];
    }
  }

  async createBookmark(data: { articleId: string; userId: number }): Promise<any> {
    if (!process.env.DATABASE_URL) {
      // Check if bookmark already exists
      const existingBookmarkIndex = inMemoryBookmarks.findIndex(
        bookmark => bookmark.articleId === data.articleId && bookmark.userId === data.userId
      );

      // If bookmark already exists, return it instead of creating a duplicate
      if (existingBookmarkIndex !== -1) {
        return inMemoryBookmarks[existingBookmarkIndex];
      }

      // Create new bookmark
      const newBookmark = {
        ...data,
        id: String(inMemoryBookmarks.length + 1),
        createdAt: new Date().toISOString()
      };
      inMemoryBookmarks.push(newBookmark);
      return newBookmark;
    }

    // For Vercel, we'll need to import modules dynamically
    try {
      const { drizzle } = await import('drizzle-orm/neon-serverless');
      const { Pool } = await import('@neondatabase/serverless');
      const { sql } = await import('drizzle-orm');

      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const db = drizzle(pool);

      // Check if bookmark already exists
      const existingResult = await db.execute(sql`
        SELECT id FROM bookmarks 
        WHERE article_id = ${data.articleId} AND user_id = ${data.userId}
        LIMIT 1
      `);

      // If bookmark already exists, return it
      if (existingResult.rows.length > 0) {
        const existingRow = existingResult.rows[0];
        return {
          id: existingRow.id,
          articleId: data.articleId,
          userId: data.userId,
          createdAt: existingRow.created_at
        };
      }

      // Insert bookmark
      const result = await db.execute(sql`
        INSERT INTO bookmarks (article_id, user_id)
        VALUES (${data.articleId}, ${data.userId})
        RETURNING id, article_id, user_id, created_at
      `);

      const row = result.rows[0];
      return {
        id: row.id,
        articleId: row.article_id,
        userId: row.user_id,
        createdAt: row.created_at
      };
    } catch (error) {
      console.error('Error creating bookmark:', error);
      throw error;
    }
  }

  async deleteBookmark(articleId: string, userId: number): Promise<boolean> {
    if (!process.env.DATABASE_URL) {
      // Delete from in-memory storage
      const bookmarkIndex = inMemoryBookmarks.findIndex(
        bookmark => bookmark.articleId === articleId && bookmark.userId === userId
      );

      if (bookmarkIndex !== -1) {
        inMemoryBookmarks.splice(bookmarkIndex, 1);
        return true;
      }
      return false;
    }

    // For Vercel, we'll need to import modules dynamically
    try {
      const { drizzle } = await import('drizzle-orm/neon-serverless');
      const { Pool } = await import('@neondatabase/serverless');
      const { sql } = await import('drizzle-orm');

      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const db = drizzle(pool);

      // Delete bookmark
      const result = await db.execute(sql`
        DELETE FROM bookmarks 
        WHERE article_id = ${articleId} AND user_id = ${userId}
      `);

      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      return false;
    }
  }
}

async function handleBookmarksEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  console.log(`Bookmark API ${req.method} ${req.url}`);

  // Get user ID from request (for authenticated endpoints)
  const userId = getUserIdFromRequest(req);

  // Create storage instance
  const storage = new SimpleBookmarkStorage();

  // Use in-memory storage when no DATABASE_URL is provided
  if (!process.env.DATABASE_URL) {
    console.log('Using in-memory storage for bookmarks');

    if (req.method === 'GET') {
      try {
        // For in-memory storage, we'll need to modify the structure to support user-specific bookmarks
        // This is a simplified implementation for development only
        const userBookmarks = userId ? inMemoryBookmarks.filter(b => b.userId === userId) : inMemoryBookmarks;

        const { export: isExport } = req.query;

        if (isExport === 'true') {
          // Export bookmarks with full article details
          const exportData = {
            exportedAt: new Date().toISOString(),
            totalBookmarks: userBookmarks.length,
            bookmarks: userBookmarks.map(bookmark => ({
              title: bookmark.title,
              summary: bookmark.summary,
              url: bookmark.url,
              source: bookmark.source,
              publishedAt: bookmark.publishedAt,
              threatLevel: bookmark.threatLevel,
              tags: bookmark.tags,
              bookmarkedAt: bookmark.createdAt
            }))
          };

          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="cyberfeed-bookmarks-${new Date().toISOString().split('T')[0]}.json"`);
          return res.json(exportData);
        } else {
          // Regular bookmarks fetch
          return res.json(userBookmarks);
        }
      } catch (error) {
        return res.status(500).json({ message: "Failed to fetch bookmarks" });
      }
    } else if (req.method === 'POST') {
      // Require authentication for creating bookmarks
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      try {
        // For validation, we only need to check the articleId since userId comes from auth
        const { articleId } = req.body;
        if (!articleId) {
          return res.status(400).json({ message: "Article ID is required" });
        }

        const newBookmark = await storage.createBookmark({ articleId, userId });
        return res.status(201).json(newBookmark);
      } catch (error) {
        return res.status(400).json({ message: "Invalid bookmark data" });
      }
    } else if (req.method === 'DELETE') {
      // Require authentication for deleting bookmarks
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      try {
        // Parse the article ID from query parameters or URL path
        let articleId: string | undefined;

        // First check query parameters
        if (req.query && req.query.articleId) {
          articleId = req.query.articleId as string;
        } else {
          // Fallback to URL path parsing
          const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
          console.log('DELETE request pathname:', pathname);

          // Extract article ID from path like /api/bookmarks/article-id
          const pathParts = pathname.split('/');
          const lastPart = pathParts[pathParts.length - 1];

          // Validate that we have an article ID
          if (lastPart && lastPart !== 'bookmarks') {
            articleId = lastPart;
          }
        }

        // Validate that we have an article ID
        if (!articleId) {
          console.log('Article ID is required');
          return res.status(400).json({ message: "Article ID is required" });
        }

        console.log('Deleting bookmark for article:', articleId, 'user:', userId);

        const deleted = await storage.deleteBookmark(articleId, userId);

        if (deleted) {
          return res.json({ message: "Bookmark removed successfully" });
        } else {
          console.log('Bookmark not found for article:', articleId, 'user:', userId);
          return res.status(404).json({ message: "Bookmark not found" });
        }
      } catch (error) {
        console.error('Error removing bookmark:', error);
        return res.status(500).json({ message: "Failed to remove bookmark" });
      }
    } else {
      console.log(`Method ${req.method} not allowed for in-memory storage`);
      return res.status(405).json({ message: 'Method not allowed' });
    }
  }

  // Use database storage when DATABASE_URL is provided
  if (req.method === 'GET') {
    // For GET requests, we'll allow unauthenticated requests to maintain backward compatibility
    // but will only return bookmarks for the authenticated user if provided
    try {
      const { export: isExport } = req.query;

      if (isExport === 'true') {
        // Export bookmarks with full article details
        // Note: For simplicity in Vercel environment, we're not implementing full export with articles
        const bookmarks = userId ? await storage.getBookmarks(userId) : [];

        // Format for export
        const exportData = {
          exportedAt: new Date().toISOString(),
          totalBookmarks: bookmarks.length,
          bookmarks: bookmarks.map((bookmark: any) => ({
            // Simplified export format for Vercel environment
            articleId: bookmark.articleId,
            bookmarkedAt: bookmark.createdAt
          }))
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="cyberfeed-bookmarks-${new Date().toISOString().split('T')[0]}.json"`);
        res.json(exportData);
      } else if (req.query.withArticles === 'true') {
        // Fetch bookmarks with associated articles
        if (!userId) {
          return res.status(401).json({ message: "Authentication required" });
        }

        try {
          const bookmarksWithArticles = await storage.getBookmarksWithArticles(userId);
          res.json(bookmarksWithArticles);
        } catch (error) {
          console.error('Error fetching bookmarks with articles:', error);
          res.status(500).json({ message: "Failed to fetch bookmarks with articles" });
        }
      } else {
        // Regular bookmarks fetch
        const bookmarks = userId ? await storage.getBookmarks(userId) : [];
        res.json(bookmarks);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookmarks" });
    }
  } else if (req.method === 'POST') {
    // Require authentication for creating bookmarks
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      // For validation, we only need to check the articleId since userId comes from auth
      const { articleId } = req.body;
      if (!articleId) {
        return res.status(400).json({ message: "Article ID is required" });
      }

      const bookmark = await storage.createBookmark({ articleId, userId });
      res.status(201).json(bookmark);
    } catch (error) {
      res.status(400).json({ message: "Invalid bookmark data" });
    }
  } else if (req.method === 'DELETE') {
    // Require authentication for deleting bookmarks
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      // Parse the article ID from query parameters or URL path
      let articleId: string | undefined;

      // First check query parameters
      if (req.query && req.query.articleId) {
        articleId = req.query.articleId as string;
      } else {
        // Fallback to URL path parsing
        const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
        console.log('DELETE request pathname:', pathname);

        // Extract article ID from path like /api/bookmarks/article-id
        const pathParts = pathname.split('/');
        const lastPart = pathParts[pathParts.length - 1];

        // Validate that we have an article ID
        if (lastPart && lastPart !== 'bookmarks') {
          articleId = lastPart;
        }
      }

      // Validate that we have an article ID
      if (!articleId) {
        console.log('Article ID is required');
        return res.status(400).json({ message: "Article ID is required" });
      }

      console.log('Deleting bookmark for article:', articleId, 'user:', userId);

      const deleted = await storage.deleteBookmark(articleId, userId);

      if (deleted) {
        res.json({ message: "Bookmark removed successfully" });
      } else {
        console.log('Bookmark not found for article:', articleId, 'user:', userId);
        res.status(404).json({ message: "Bookmark not found" });
      }
    } catch (error) {
      console.error('Error removing bookmark:', error);
      res.status(500).json({ message: "Failed to remove bookmark" });
    }
  } else {
    console.log(`Method ${req.method} not allowed for database storage`);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}

// Add a function to refresh tokens
function refreshToken(payload: any): string {
  // Remove old timestamp fields if they exist
  const { iat, exp, ...cleanPayload } = payload;

  // Generate new token with updated timestamps
  const newPayload = {
    ...cleanPayload,
    exp: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000) // 24 hours in seconds
  };

  return generateToken(newPayload);
}

/**
 * Get user statistics
 * @returns User statistics including total users, recent logins, etc.
 */
async function getUserStatistics() {
  // Import modules dynamically
  const { drizzle } = await import('drizzle-orm/neon-serverless');
  const { Pool } = await import('@neondatabase/serverless');
  const { sql } = await import('drizzle-orm');
  const { users, userPreferences } = await import('../shared/schema.js');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  try {
    const allUsers = await db.select().from(users);

    // Fetch user preferences for display names
    const allPreferences = await db.select().from(userPreferences);
    const preferencesMap = new Map(allPreferences.map(p => [p.userId, p.displayName]));

    // Calculate statistics
    const totalUsers = allUsers.length;

    // Count users who logged in within the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogins = allUsers.filter(user =>
      new Date(user.lastLoginAt) > oneDayAgo
    ).length;

    // Count users created within the last 7 days
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUserCount = allUsers.filter(user =>
      new Date(user.createdAt) > oneWeekAgo
    ).length;

    // Count active users (logged in within the last 7 days)
    const activeUsersWeek = allUsers.filter(user =>
      new Date(user.lastLoginAt) > oneWeekAgo
    ).length;

    // Get ALL users (not just recent 10) with display names, sorted by creation date (newest first)
    const allUsersList = [...allUsers]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(user => ({
        id: user.id,
        name: user.name,
        displayName: preferencesMap.get(user.id) || null,
        email: user.email,
        avatar: user.avatar || null,
        googleId: user.googleId || null,
        emailVerified: user.emailVerified || false,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      }));

    // Calculate signup trend data (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const signupTrend = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const count = allUsers.filter(user => {
        const createdDate = new Date(user.createdAt);
        return createdDate >= startOfDay && createdDate <= endOfDay;
      }).length;

      signupTrend.push({
        date: startOfDay.toISOString().split('T')[0],
        count: count
      });
    }

    return {
      totalUsers,
      recentLogins,
      newUserCount,
      activeUsersWeek,
      allUsers: allUsersList,
      signupTrend,
    };
  } catch (error) {
    console.error('Error in getUserStatistics:', error);
    // Return default values if there's an error (e.g., table doesn't exist)
    return {
      totalUsers: 0,
      recentLogins: 0,
      newUserCount: 0,
      activeUsersWeek: 0,
      allUsers: [],
      signupTrend: [],
    };
  }
}

/**
 * Get all users (for admin purposes)
 * @returns All users in the system
 */
async function getAllUsers(): Promise<UserLoginRecord[]> {
  // Import modules dynamically
  const { drizzle } = await import('drizzle-orm/neon-serverless');
  const { Pool } = await import('@neondatabase/serverless');
  const { sql } = await import('drizzle-orm');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  try {
    const allUsers = await db.select().from(users);

    return allUsers.map(user => ({
      id: user.id,
      googleId: user.googleId,
      name: user.name,
      email: user.email,
      avatar: user.avatar || null,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      hasOnboarded: user.hasOnboarded || false,
    }));
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    // Return empty array if there's an error (e.g., table doesn't exist)
    return [];
  }
}

async function handleUserManagementEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  try {
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        error: 'Database not configured',
        message: 'DATABASE_URL environment variable is not set'
      });
    }

    // Verify admin authorization for all requests
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Check if user is admin
    if (!decoded.isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied. Admin access required.'
      });
    }

    // Refresh the token for continued sessions
    const newToken = refreshToken(decoded);

    // GET requests
    if (req.method === 'GET') {
      const { stats } = req.query;

      if (stats === 'true') {
        // Get user statistics
        const statsData = await getUserStatistics();
        res.status(200).json({ ...statsData, token: newToken });
      } else {
        // Get all users
        const users = await getAllUsers();
        res.status(200).json({ users, token: newToken });
      }
    }
    // POST requests
    else if (req.method === 'POST' && action === 'resend-verification') {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Import storage and email service dynamically
      const { PostgresStorage } = await import('../server/postgres-storage.js');
      const { sendVerificationEmail } = await import('../server/email-service.js');
      const storage = new PostgresStorage();

      // Get user by ID
      const { drizzle } = await import('drizzle-orm/neon-serverless');
      const { Pool } = await import('@neondatabase/serverless');
      const { users } = await import('../shared/schema.js');
      const { eq } = await import('drizzle-orm');

      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const db = drizzle(pool);

      const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const user = userResult[0];

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.googleId) {
        return res.status(400).json({ error: 'Google users do not need email verification' });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: 'User email is already verified' });
      }

      // Generate new verification token
      const { generateSecureToken } = await import('../server/auth/password-utils.js');
      const verificationToken = generateSecureToken();
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Update user with new token
      await db.update(users)
        .set({
          verificationToken,
          verificationTokenExpiry
        })
        .where(eq(users.id, userId));

      // Send verification email
      await sendVerificationEmail(user.email, user.name, verificationToken);

      res.status(200).json({
        message: 'Verification email sent successfully',
        token: newToken
      });
    }
    // DELETE requests
    else if (req.method === 'DELETE' && action === 'delete') {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const userIdNum = parseInt(userId as string);

      // Prevent admin from deleting themselves
      if (decoded.userId === userIdNum) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      // Delete user (cascade will handle related records)
      const { drizzle } = await import('drizzle-orm/neon-serverless');
      const { Pool } = await import('@neondatabase/serverless');
      const { users } = await import('../shared/schema.js');
      const { eq } = await import('drizzle-orm');

      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const db = drizzle(pool);

      await db.delete(users).where(eq(users.id, userIdNum));

      res.status(200).json({
        message: 'User deleted successfully',
        token: newToken
      });
    }
    else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in user management endpoint:', error);
    res.status(500).json({
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}

// Simplified user source preferences storage implementation
class SimpleUserSourcePreferenceStorage {
  // In-memory storage for local development
  private inMemoryPreferences: any[] = [];

  async getUserSourcePreferences(userId: number): Promise<any[]> {
    if (!process.env.DATABASE_URL) {
      // Return in-memory preferences filtered by userId
      return this.inMemoryPreferences.filter(p => p.userId === userId);
    }

    // For Vercel, we'll need to import modules dynamically
    try {
      const { drizzle } = await import('drizzle-orm/neon-serverless');
      const { Pool } = await import('@neondatabase/serverless');
      const { sql } = await import('drizzle-orm');

      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const db = drizzle(pool);

      // Query user_source_preferences table
      const result = await db.execute(sql`
        SELECT id, user_id, source_id, is_active, created_at, updated_at
        FROM user_source_preferences 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `);

      return result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        sourceId: row.source_id,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Error fetching user source preferences:', error);
      return [];
    }
  }

  async createUserSourcePreference(data: { userId: number; sourceId: string; isActive?: boolean }): Promise<any> {
    if (!process.env.DATABASE_URL) {
      // Create in-memory preference
      const newPreference = {
        ...data,
        id: String(this.inMemoryPreferences.length + 1),
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.inMemoryPreferences.push(newPreference);
      return newPreference;
    }

    // For Vercel, we'll need to import modules dynamically
    try {
      const { drizzle } = await import('drizzle-orm/neon-serverless');
      const { Pool } = await import('@neondatabase/serverless');
      const { sql } = await import('drizzle-orm');

      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const db = drizzle(pool);

      // Check if preference already exists
      const existingResult = await db.execute(sql`
        SELECT id FROM user_source_preferences 
        WHERE user_id = ${data.userId} AND source_id = ${data.sourceId}
        LIMIT 1
      `);

      // If preference already exists, update it
      if (existingResult.rows.length > 0) {
        const existingRow = existingResult.rows[0];
        const result = await db.execute(sql`
          UPDATE user_source_preferences 
          SET is_active = ${data.isActive !== undefined ? data.isActive : true}, updated_at = NOW()
          WHERE id = ${existingRow.id}
          RETURNING id, user_id, source_id, is_active, created_at, updated_at
        `);

        const updatedRow = result.rows[0];
        return {
          id: updatedRow.id,
          userId: updatedRow.user_id,
          sourceId: updatedRow.source_id,
          isActive: updatedRow.is_active,
          createdAt: updatedRow.created_at,
          updatedAt: updatedRow.updated_at
        };
      }

      // Insert new preference
      const result = await db.execute(sql`
        INSERT INTO user_source_preferences (user_id, source_id, is_active)
        VALUES (${data.userId}, ${data.sourceId}, ${data.isActive !== undefined ? data.isActive : true})
        RETURNING id, user_id, source_id, is_active, created_at, updated_at
      `);

      const insertedRow = result.rows[0];
      return {
        id: insertedRow.id,
        userId: insertedRow.user_id,
        sourceId: insertedRow.source_id,
        isActive: insertedRow.is_active,
        createdAt: insertedRow.created_at,
        updatedAt: insertedRow.updated_at
      };
    } catch (error) {
      console.error('Error creating user source preference:', error);
      throw error;
    }
  }

  async deleteUserSourcePreference(userId: number, sourceId: string): Promise<boolean> {
    if (!process.env.DATABASE_URL) {
      // Delete from in-memory storage
      const index = this.inMemoryPreferences.findIndex(p => p.userId === userId && p.sourceId === sourceId);
      if (index !== -1) {
        this.inMemoryPreferences.splice(index, 1);
        return true;
      }
      return false;
    }

    // For Vercel, we'll need to import modules dynamically
    try {
      const { drizzle } = await import('drizzle-orm/neon-serverless');
      const { Pool } = await import('@neondatabase/serverless');
      const { sql } = await import('drizzle-orm');

      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const db = drizzle(pool);

      const result = await db.execute(sql`
        DELETE FROM user_source_preferences 
        WHERE user_id = ${userId} AND source_id = ${sourceId}
      `);

      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting user source preference:', error);
      return false;
    }
  }
}

async function handleUserSourcePreferencesEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  // Get user ID from request (for authenticated endpoints)
  const userId = getUserIdFromRequest(req);

  // Require authentication for all endpoints
  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Create storage instance
  const storage = new SimpleUserSourcePreferenceStorage();

  if (req.method === 'GET') {
    try {
      const preferences = await storage.getUserSourcePreferences(userId);
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user source preferences" });
    }
  } else if (req.method === 'POST') {
    try {
      const { sourceId, isActive } = req.body;
      if (!sourceId) {
        return res.status(400).json({ message: "Source ID is required" });
      }

      const preference = await storage.createUserSourcePreference({ userId, sourceId, isActive });
      res.status(201).json(preference);
    } catch (error) {
      res.status(400).json({ message: "Invalid preference data" });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Parse the source ID from query parameters
      let sourceId: string | undefined;

      // First check query parameters
      if (req.query && req.query.sourceId) {
        sourceId = req.query.sourceId as string;
      }

      if (!sourceId) {
        return res.status(400).json({ message: "Source ID is required" });
      }

      const result = await storage.deleteUserSourcePreference(userId, sourceId);
      if (result) {
        res.status(204).send('');
      } else {
        res.status(404).json({ message: "Preference not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user source preference" });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleUserPreferencesEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  // Get user ID from request (for authenticated endpoints)
  const userId = getUserIdFromRequest(req);

  // Require authentication for all endpoints
  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Get database connection
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: 'DATABASE_URL environment variable is required' });
    }

    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    if (req.method === 'GET') {
      // Get user preferences
      const result = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);

      if (result.length === 0) {
        // Return default preferences if none exist
        return res.json({
          userId,
          displayName: null,
          watchlistKeywords: null,
          autoExtractIOCs: true,
          autoEnrichIOCs: false,
          hiddenIOCTypes: [],
          emailWeeklyDigest: false,
          emailWatchlistAlerts: false,
        });
      }

      res.json(result[0]);
    } else if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      // Update or create user preferences
      const { displayName, watchlistKeywords, autoExtractIOCs, autoEnrichIOCs, hiddenIOCTypes, emailWeeklyDigest, emailWatchlistAlerts } = req.body;

      // Validate displayName if provided
      if (displayName !== undefined && displayName !== null && displayName !== '') {
        if (typeof displayName !== 'string') {
          return res.status(400).json({ message: "Display name must be a string" });
        }
        if (displayName.length > 50) {
          return res.status(400).json({ message: "Display name must be 50 characters or less" });
        }
        if (!/^[a-zA-Z0-9\s]+$/.test(displayName)) {
          return res.status(400).json({ message: "Display name must contain only letters, numbers, and spaces" });
        }
      }

      // Check if preferences exist
      const existing = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);

      if (existing.length === 0) {
        // Create new preferences
        const result = await db.insert(userPreferences).values({
          userId,
          displayName: displayName || null,
          watchlistKeywords: watchlistKeywords || null,
          autoExtractIOCs: autoExtractIOCs ?? true,
          autoEnrichIOCs: autoEnrichIOCs ?? false,
          hiddenIOCTypes: hiddenIOCTypes || [],
          emailWeeklyDigest: emailWeeklyDigest ?? false,
          emailWatchlistAlerts: emailWatchlistAlerts ?? false,
        }).returning();

        return res.status(201).json(result[0]);
      } else {
        // Update existing preferences
        const updateData: any = { updatedAt: new Date() };

        if (displayName !== undefined) updateData.displayName = displayName || null;
        if (watchlistKeywords !== undefined) updateData.watchlistKeywords = watchlistKeywords || null;
        if (autoExtractIOCs !== undefined) updateData.autoExtractIOCs = autoExtractIOCs;
        if (autoEnrichIOCs !== undefined) updateData.autoEnrichIOCs = autoEnrichIOCs;
        if (hiddenIOCTypes !== undefined) updateData.hiddenIOCTypes = hiddenIOCTypes;
        if (emailWeeklyDigest !== undefined) updateData.emailWeeklyDigest = emailWeeklyDigest;
        if (emailWatchlistAlerts !== undefined) updateData.emailWatchlistAlerts = emailWatchlistAlerts;

        const result = await db.update(userPreferences)
          .set(updateData)
          .where(eq(userPreferences.userId, userId))
          .returning();

        return res.json(result[0]);
      }
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('User preferences API error:', error);
    res.status(500).json({
      message: "Failed to process user preferences request",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleVisitorCountEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  // Get the origin from the request
  const origin = req.headers.origin || '*';

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.setHeader('Vary', 'Origin'); // Important for CORS with multiple origins

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'POST') {
      // Increment visitor count using CounterAPI v1 (no authentication needed)
      // Added trailing slash to avoid 301 redirect that causes CORS issues
      const counterUrl = `https://api.counterapi.dev/v1/threatfeed/visitorstothreatfeed/up/`;

      const response = await fetch(counterUrl, {
        method: 'GET'  // CounterAPI v1 uses GET for incrementing
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`CounterAPI v1 increment failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`CounterAPI v1 increment failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      res.status(200).json(data);
    } else if (req.method === 'GET') {
      // Get visitor count using CounterAPI v1 (no authentication needed)
      // Added trailing slash to avoid 301 redirect that causes CORS issues
      const counterUrl = `https://api.counterapi.dev/v1/threatfeed/visitorstothreatfeed/`;

      const response = await fetch(counterUrl, {
        method: 'GET'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`CounterAPI v1 fetch failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`CounterAPI v1 fetch failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      res.status(200).json(data);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Visitor count API error:', error);
    res.status(500).json({ error: 'Failed to process visitor count request', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}

async function handleVulnerabilitiesEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Fetching vulnerabilities from database...');

    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is missing');
      return res.status(500).json({
        error: 'DATABASE_URL environment variable is required',
        debug: 'Check Vercel environment variables configuration'
      });
    }

    console.log('DATABASE_URL is configured');

    // Import modules dynamically
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql, desc } = await import('drizzle-orm');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    console.log('Database connection established');

    // Test database connectivity and table existence
    try {
      const tableCheck = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'vulnerabilities'
      `);

      const tableExists = parseInt(tableCheck.rows[0]?.count as string || '0') > 0;

      if (!tableExists) {
        console.error('vulnerabilities table does not exist');
        return res.status(500).json({
          error: 'vulnerabilities table does not exist',
          debug: 'Run database initialization first: POST /api/database?action=init',
          tableExists: false
        });
      }

      console.log('vulnerabilities table exists');

      // Check if table has any data
      const countCheck = await db.execute(sql`SELECT COUNT(*) as total FROM vulnerabilities`);
      const totalRecords = parseInt(countCheck.rows[0]?.total as string || '0');
      console.log(`Total vulnerabilities in database: ${totalRecords}`);

      if (totalRecords === 0) {
        console.warn('vulnerabilities table is empty');
        return res.json({
          vulnerabilities: [],
          pagination: {
            page: 1,
            limit: 50,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
          meta: {
            count: 0,
            lastUpdated: new Date().toISOString(),
            message: 'No vulnerabilities found. Run CVE fetch process to populate data.',
            debug: 'POST /api/fetch-cves to fetch data from NVD'
          },
        });
      }

    } catch (dbError) {
      console.error('Database connectivity or table check failed:', dbError);
      return res.status(500).json({
        error: 'Database connectivity failed',
        debug: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }

    // Parse query parameters
    const {
      limit = '50',
      severity,
      page = '1',
      sort = 'newest'
    } = req.query;

    console.log('Query parameters:', { limit, severity, page, sort });

    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);
    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const offset = (pageNum - 1) * limitNum;

    // Determine sort order
    let orderByClause;
    switch (sort) {
      case 'relevant':
        // For "Most Relevant", we might want to sort by CVSS score (highest first) 
        // and then by last modified date
        orderByClause = 'ORDER BY COALESCE(cvss_v3_score, cvss_v2_score) DESC NULLS LAST, last_modified_date DESC, published_date DESC';
        break;
      case 'newest':
      default:
        // Newest first by publication date (not modification date)
        orderByClause = 'ORDER BY published_date DESC, last_modified_date DESC';
        break;
    }

    // Build query based on whether severity filter is applied
    let query;
    if (severity && typeof severity === 'string') {
      const severityUpper = severity.toUpperCase();
      if (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(severityUpper)) {
        query = sql`
          SELECT 
            id,
            description,
            published_date,
            last_modified_date,
            vuln_status,
            cvss_v3_score,
            cvss_v3_severity,
            cvss_v2_score,
            cvss_v2_severity,
            weaknesses,
            reference_urls,
            created_at
          FROM vulnerabilities
          WHERE (cvss_v3_severity = ${severityUpper} OR cvss_v2_severity = ${severityUpper})
          ${sql.raw(orderByClause)}
          LIMIT ${limitNum}
          OFFSET ${offset}
        `;
      } else {
        // Invalid severity filter, return all
        query = sql`
          SELECT 
            id,
            description,
            published_date,
            last_modified_date,
            vuln_status,
            cvss_v3_score,
            cvss_v3_severity,
            cvss_v2_score,
            cvss_v2_severity,
            weaknesses,
            reference_urls,
            created_at
          FROM vulnerabilities
          ${sql.raw(orderByClause)}
          LIMIT ${limitNum}
          OFFSET ${offset}
        `;
      }
    } else {
      // No severity filter, return all
      query = sql`
        SELECT 
          id,
          description,
          published_date,
          last_modified_date,
          vuln_status,
          cvss_v3_score,
          cvss_v3_severity,
          cvss_v2_score,
          cvss_v2_severity,
          weaknesses,
          reference_urls,
          created_at
        FROM vulnerabilities
        ${sql.raw(orderByClause)}
        LIMIT ${limitNum}
        OFFSET ${offset}
      `;
    }

    const result = await db.execute(query);

    // Get total count for pagination
    let countQuery;
    if (severity && typeof severity === 'string') {
      const severityUpper = severity.toUpperCase();
      if (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(severityUpper)) {
        countQuery = sql`
          SELECT COUNT(*) as total FROM vulnerabilities
          WHERE (cvss_v3_severity = ${severityUpper} OR cvss_v2_severity = ${severityUpper})
        `;
      } else {
        // Invalid severity filter, count all
        countQuery = sql`SELECT COUNT(*) as total FROM vulnerabilities`;
      }
    } else {
      // No severity filter, count all
      countQuery = sql`SELECT COUNT(*) as total FROM vulnerabilities`;
    }

    const countResult = await db.execute(countQuery);
    const totalCount = Number(countResult.rows[0]?.total || 0);

    // Format vulnerabilities data
    const vulnerabilities = result.rows.map((row: any) => ({
      id: row.id,
      description: row.description,
      publishedDate: row.published_date,
      lastModifiedDate: row.last_modified_date,
      vulnStatus: row.vuln_status,
      cvssV3Score: row.cvss_v3_score ? parseFloat(row.cvss_v3_score) : null,
      cvssV3Severity: row.cvss_v3_severity,
      cvssV2Score: row.cvss_v2_score ? parseFloat(row.cvss_v2_score) : null,
      cvssV2Severity: row.cvss_v2_severity,
      weaknesses: row.weaknesses || [],
      references: row.reference_urls || [],
      createdAt: row.created_at,
    }));

    console.log(`Found ${vulnerabilities.length} vulnerabilities`);

    res.json({
      vulnerabilities,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasNext: pageNum * limitNum < totalCount,
        hasPrev: pageNum > 1,
      },
      meta: {
        count: vulnerabilities.length,
        lastUpdated: new Date().toISOString(),
        sort: sort as string,
      },
    });

  } catch (error) {
    console.error("Error fetching vulnerabilities:", error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      databaseUrl: !!process.env.DATABASE_URL
    });

    res.status(500).json({
      message: "Failed to fetch vulnerabilities",
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        timestamp: new Date().toISOString(),
        databaseConfigured: !!process.env.DATABASE_URL,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      }
    });
  }
}

async function handleFetchCvesEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Starting CVE fetch process...');

    // Enhanced environment variable checking
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is missing');
      return res.status(500).json({
        error: 'DATABASE_URL environment variable is required',
        debug: 'Check Vercel environment variables configuration'
      });
    }

    if (!process.env.NVD_API_KEY) {
      console.error('NVD_API_KEY environment variable is missing');
      return res.status(500).json({
        error: 'NVD_API_KEY environment variable is required',
        debug: 'Check Vercel environment variables configuration'
      });
    }

    console.log('Environment variables are set correctly');

    // Import modules dynamically
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql } = await import('drizzle-orm');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    console.log('Database connection established');

    // Test database connectivity and table existence
    try {
      const tableCheck = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'vulnerabilities'
      `);

      if (parseInt(tableCheck.rows[0]?.count as string || '0') === 0) {
        console.error('vulnerabilities table does not exist');
        return res.status(500).json({
          error: 'vulnerabilities table does not exist',
          debug: 'Run database initialization first: POST /api/database?action=init'
        });
      }

      console.log('vulnerabilities table exists');
    } catch (dbError) {
      console.error('Database connectivity test failed:', dbError);
      return res.status(500).json({
        error: 'Database connectivity failed',
        debug: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }

    console.log('Fetching latest CVEs from NVD API...');

    // Calculate date range for recent CVEs (last 30 days to get more data)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Fetch CVEs from NVD API by publication date (not modification date)
    const nvdResponse = await fetch(
      `https://services.nvd.nist.gov/rest/json/cves/2.0/?pubStartDate=${startDateStr}T00:00:00.000&pubEndDate=${endDateStr}T23:59:59.999&resultsPerPage=100`,
      {
        headers: {
          'apiKey': process.env.NVD_API_KEY,
          'User-Agent': 'ThreatIntelDigest/1.0',
          'Accept': 'application/json'
        }
      }
    );

    if (!nvdResponse.ok) {
      throw new Error(`NVD API error: ${nvdResponse.status} ${nvdResponse.statusText}`);
    }

    const nvdData = await nvdResponse.json();
    console.log(`Found ${nvdData.vulnerabilities?.length || 0} CVEs from NVD`);

    let processedCount = 0;
    let errors: string[] = [];

    if (nvdData.vulnerabilities && nvdData.vulnerabilities.length > 0) {
      for (const vuln of nvdData.vulnerabilities) {
        try {
          const cve = vuln.cve;
          const cveId = cve.id;

          // Check if CVE already exists
          const existingResult = await db.execute(sql`
            SELECT id FROM vulnerabilities WHERE id = ${cveId}
          `);

          // Extract description
          const description = cve.descriptions?.find((desc: any) => desc.lang === 'en')?.value || 'No description available';

          // Extract CVSS scores
          let cvssV3Score = null;
          let cvssV3Severity = null;
          let cvssV2Score = null;
          let cvssV2Severity = null;

          const metrics = cve.metrics;
          if (metrics?.cvssMetricV31?.[0]) {
            cvssV3Score = metrics.cvssMetricV31[0].cvssData.baseScore;
            cvssV3Severity = metrics.cvssMetricV31[0].cvssData.baseSeverity;
          } else if (metrics?.cvssMetricV30?.[0]) {
            cvssV3Score = metrics.cvssMetricV30[0].cvssData.baseScore;
            cvssV3Severity = metrics.cvssMetricV30[0].cvssData.baseSeverity;
          }

          if (metrics?.cvssMetricV2?.[0]) {
            cvssV2Score = metrics.cvssMetricV2[0].cvssData.baseScore;
            cvssV2Severity = metrics.cvssMetricV2[0].baseSeverity;
          }

          // Extract weaknesses (CWEs)
          const weaknesses = cve.weaknesses?.map((weakness: any) =>
            weakness.description?.find((desc: any) => desc.lang === 'en')?.value
          ).filter(Boolean) || [];

          // Extract references
          const references = cve.references?.map((ref: any) => ({
            url: ref.url,
            source: ref.source || 'Unknown',
            tags: ref.tags || []
          })) || [];

          // Convert arrays to proper PostgreSQL format
          // Ensure weaknesses is a proper string array for PostgreSQL text[]
          const weaknessesArray = Array.isArray(weaknesses) ? weaknesses : [];
          const referencesJson = JSON.stringify(references);

          console.log(`Processing CVE ${cveId} with weaknesses:`, weaknessesArray);

          // Construct array literal for PostgreSQL
          const weaknessesLiteral = '{' + weaknessesArray.map(w => `"${w?.replace(/"/g, '\\"') || ''}"`).join(',') + '}';

          if (existingResult.rows.length === 0) {
            // Insert new CVE
            await db.execute(sql`
              INSERT INTO vulnerabilities (
                id, description, published_date, last_modified_date, vuln_status,
                cvss_v3_score, cvss_v3_severity, cvss_v2_score, cvss_v2_severity,
                weaknesses, reference_urls
              )
              VALUES (
                ${cveId}, ${description}, ${cve.published}, ${cve.lastModified}, ${cve.vulnStatus},
                ${cvssV3Score !== null ? String(cvssV3Score) : null}, ${cvssV3Severity}, 
                ${cvssV2Score !== null ? String(cvssV2Score) : null}, ${cvssV2Severity},
                ${weaknessesLiteral}::text[], ${referencesJson}::jsonb
              )
            `);

            processedCount++;
            console.log(`Saved new CVE: ${cveId}`);
          } else {
            // Update existing CVE with latest information
            await db.execute(sql`
              UPDATE vulnerabilities SET
                description = ${description},
                published_date = ${cve.published},
                last_modified_date = ${cve.lastModified},
                vuln_status = ${cve.vulnStatus},
                cvss_v3_score = ${cvssV3Score !== null ? String(cvssV3Score) : null},
                cvss_v3_severity = ${cvssV3Severity},
                cvss_v2_score = ${cvssV2Score !== null ? String(cvssV2Score) : null},
                cvss_v2_severity = ${cvssV2Severity},
                weaknesses = ${weaknessesLiteral}::text[],
                reference_urls = ${referencesJson}::jsonb
              WHERE id = ${cveId}
            `);

            console.log(`Updated existing CVE: ${cveId}`);
          }
        } catch (cveError) {
          console.error(`Failed to process CVE:`, cveError);
          errors.push(`Failed to process CVE: ${cveError instanceof Error ? cveError.message : 'Unknown error'}`);
        }
      }
    }

    console.log(`CVE fetch complete. Processed ${processedCount} new CVEs.`);
    res.json({
      message: `Successfully fetched ${processedCount} new CVEs`,
      totalProcessed: processedCount,
      totalFromAPI: nvdData.vulnerabilities?.length || 0,
      errors: errors.length > 0 ? errors.slice(0, 5) : [], // Return first 5 errors
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error fetching CVEs:", error);
    res.status(500).json({
      message: "Failed to fetch CVEs from NVD",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper functions for fetch-feeds
function determineThreatLevel(title: string, content: string): string {
  const text = (title + " " + content).toLowerCase();

  if (text.includes("critical") || text.includes("zero-day") || text.includes("ransomware")) {
    return "CRITICAL";
  } else if (text.includes("high") || text.includes("vulnerability") || text.includes("exploit")) {
    return "HIGH";
  } else {
    return "MEDIUM";
  }
}

function extractTags(title: string, content: string): string[] {
  const text = (title + " " + content).toLowerCase();
  const tags: string[] = [];

  const commonTags = [
    "malware", "ransomware", "phishing", "zero-day", "vulnerability",
    "exploit", "apt", "microsoft", "google", "apple", "android", "ios",
    "windows", "linux", "cloud", "aws", "azure", "kubernetes", "docker"
  ];

  commonTags.forEach(tag => {
    if (text.includes(tag)) {
      tags.push(tag.charAt(0).toUpperCase() + tag.slice(1));
    }
  });

  return tags.slice(0, 3); // Limit to 3 tags
}

function estimateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

async function handleFetchFeedsEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Starting RSS feed fetch process...');

    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        error: 'DATABASE_URL environment variable is required'
      });
    }

    // Import modules dynamically
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql } = await import('drizzle-orm');
    const Parser = (await import('rss-parser')).default;

    const parser = new Parser();

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    // Clean up old articles (older than 30 days)
    console.log('Cleaning up old articles...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const cleanupResult = await db.execute(sql`
      DELETE FROM articles 
      WHERE published_at < ${thirtyDaysAgo}
    `);

    console.log(`Cleaned up ${cleanupResult.rowCount || 0} old articles`);

    // Get active RSS sources
    console.log('Fetching active RSS sources...');
    const sourcesResult = await db.execute(sql`
      SELECT id, name, url, icon, color, is_active 
      FROM rss_sources 
      WHERE is_active = true
    `);

    const activeSources = sourcesResult.rows;
    console.log(`Found ${activeSources.length} active RSS sources`);

    let totalFetched = 0;
    let feedResults: any[] = [];

    for (const source of activeSources) {
      // Skip disabled sources
      if (source.disabled) {
        console.log(`Skipping disabled source: ${source.name}`);
        continue;
      }

      let sourceResult: any = {
        name: source.name,
        url: source.url,
        itemsFound: 0,
        itemsProcessed: 0,
        errors: [] as string[]
      };

      // Retry mechanism for failed feeds
      let retryCount = 0;
      const maxRetries = 2;
      let success = false;

      while (retryCount <= maxRetries && !success) {
        try {
          console.log(`Fetching feed from ${source.name} (${source.url})${retryCount > 0 ? ` (retry ${retryCount})` : ''}...`);

          // Add timeout and handle SSL certificate issues by using fetch with custom options
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

          let fetchErrorHandled = false;
          let response;
          try {
            response = await fetch(source.url as string, {
              signal: controller.signal,
              headers: {
                'User-Agent': process.env.RSS_USER_AGENT || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            clearTimeout(timeoutId);
          } catch (fetchError) {
            clearTimeout(timeoutId);
            // Handle SSL certificate errors specifically
            if (fetchError instanceof Error && (fetchError.message.includes('unable to verify') || fetchError.message.includes('certificate'))) {
              console.error(`SSL Certificate error for ${source.name}:`, fetchError.message);
              sourceResult.errors.push(`SSL Certificate error: ${fetchError.message}`);
              // Skip to next source instead of failing completely
              break;
            }
            // Handle timeout errors
            else if (fetchError instanceof Error && fetchError.name === 'AbortError') {
              console.error(`Timeout error for ${source.name}: Request timed out`);
              sourceResult.errors.push(`Timeout error: Request timed out`);
              break;
            } else {
              throw fetchError;
            }
          }

          // If we handled an error, skip to the next source
          if (fetchErrorHandled) {
            break;
          }

          // At this point, response should be defined
          if (response && !response.ok) {
            const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            console.error(`HTTP error for ${source.name}:`, errorMessage);
            // Handle 404 errors specifically
            if (response.status === 404) {
              sourceResult.errors.push(`Feed URL not found (404): The feed URL may be invalid or the source may have moved`);
              break;
            }
            // Handle 500 errors with retry
            else if (response.status >= 500 && retryCount < maxRetries) {
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
              continue;
            }
            throw new Error(errorMessage);
          }

          if (!response) {
            throw new Error('Response is undefined');
          }

          let xmlText = await response.text();

          // Sanitize XML text to handle common parsing issues
          // Handle unescaped ampersands
          xmlText = xmlText.replace(/&(?![a-zA-Z0-9#]{1,10};)/g, '&amp;');

          // Remove any null bytes that might cause issues
          xmlText = xmlText.replace(/\0/g, '');

          const feed = await parser.parseString(xmlText);
          console.log(`Feed parsed successfully. Found ${feed.items.length} items`);

          sourceResult.itemsFound = feed.items.length;

          let processedCount = 0;
          for (const item of feed.items.slice(0, 10)) { // Limit to 10 latest items per source
            if (!item.title || !item.link) {
              console.log('Skipping item: missing title or link');
              continue;
            }

            // Check if article already exists
            const existingResult = await db.execute(sql`
              SELECT id FROM articles WHERE url = ${item.link}
            `);

            if (existingResult.rows.length === 0) {
              const threatLevel = determineThreatLevel(item.title || "", item.contentSnippet || "");
              const tags = extractTags(item.title || "", item.contentSnippet || "");
              const readTime = estimateReadTime(item.contentSnippet || item.content || "");
              const summary = (item.contentSnippet || item.content?.substring(0, 300) || "") + ((item.content && item.content.length > 300) ? "..." : "");

              // Handle published date - use current time if parsing fails
              let publishedAt: Date;
              try {
                publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();
                // Validate the date
                if (isNaN(publishedAt.getTime())) {
                  publishedAt = new Date();
                }
              } catch {
                publishedAt = new Date();
              }

              try {
                console.log(`Inserting article: ${item.title}`);
                console.log(`Published At:`, publishedAt);

                // Temporarily skip tags field to get basic insertion working
                await db.execute(sql`
                  INSERT INTO articles (title, summary, url, source, threat_level, read_time, published_at)
                  VALUES (${item.title}, ${summary}, ${item.link}, ${source.name}, ${threatLevel}, ${readTime}, ${publishedAt})
                `);

                totalFetched++;
                processedCount++;
                sourceResult.itemsProcessed++;
                console.log(`Saved article: ${item.title}`);
              } catch (insertError) {
                console.error(`Failed to insert article "${item.title}":`, insertError);
                sourceResult.errors.push(`Insert failed: ${insertError instanceof Error ? insertError.message : 'Unknown error'}`);
              }
            } else {
              console.log(`Article already exists: ${item.title}`);
            }
          }

          // Update last fetched timestamp for the source
          await db.execute(sql`
            UPDATE rss_sources 
            SET last_fetched = NOW() 
            WHERE id = ${source.id}
          `);

          console.log(`Processed ${processedCount} new articles from ${source.name}`);
          success = true; // Mark as successful

        } catch (feedError) {
          console.error(`Error fetching feed for ${source.name}:`, feedError);
          console.error('Feed URL:', source.url);
          console.error('Error details:', feedError instanceof Error ? feedError.message : feedError);

          // Handle specific XML parsing errors
          if (feedError instanceof Error) {
            if (feedError.message.includes('Invalid character in entity name')) {
              sourceResult.errors.push(`XML parsing error: Invalid character in feed. This is often caused by unescaped ampersands (&) in the XML. Error at column: ${feedError.message.match(/Column: (\d+)/)?.[1] || 'unknown'}`);
            } else if (feedError.message.includes('Attribute without value')) {
              sourceResult.errors.push(`XML parsing error: Attribute without value. This feed contains malformed XML attributes. Error at line: ${feedError.message.match(/Line: (\d+)/)?.[1] || 'unknown'}, column: ${feedError.message.match(/Column: (\d+)/)?.[1] || 'unknown'}`);
            } else if (feedError.message.includes('No whitespace between attributes')) {
              sourceResult.errors.push(`XML parsing error: No whitespace between attributes. This feed contains malformed XML. Error at line: ${feedError.message.match(/Line: (\d+)/)?.[1] || 'unknown'}, column: ${feedError.message.match(/Column: (\d+)/)?.[1] || 'unknown'}`);
            } else if (feedError.message.includes('Invalid attribute name')) {
              sourceResult.errors.push(`XML parsing error: Invalid attribute name. This feed contains malformed XML. Error at line: ${feedError.message.match(/Line: (\d+)/)?.[1] || 'unknown'}, column: ${feedError.message.match(/Column: (\d+)/)?.[1] || 'unknown'}`);
            } else if (feedError.message.includes('Feed not recognized as RSS')) {
              sourceResult.errors.push(`RSS format error: Feed not recognized as RSS 1 or 2. The URL may not point to a valid RSS feed.`);
            } else {
              sourceResult.errors.push(feedError.message);
            }
          } else {
            sourceResult.errors.push('Unknown error');
          }

          // Retry on certain errors
          if (retryCount < maxRetries && feedError instanceof Error &&
            (feedError.message.includes('timeout') || feedError.message.includes('network') || feedError.message.includes('500'))) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
            continue;
          } else {
            // Don't retry, break out of retry loop
            break;
          }
        }
      }

      feedResults.push(sourceResult);
    }

    console.log(`Feed fetch complete. Fetched ${totalFetched} new articles.`);
    res.json({
      message: `Successfully fetched ${totalFetched} new articles`,
      totalFetched,
      sourceResults: feedResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error fetching feeds:", error);
    res.status(500).json({
      message: "Failed to fetch RSS feeds",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleFetchArticleEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ message: 'URL parameter is required' });
  }

  try {
    // Import required modules dynamically
    const { default: axios } = await import('axios');
    const { JSDOM } = await import('jsdom');
    const { Readability } = await import('@mozilla/readability');

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ message: 'Invalid URL format' });
    }

    // Fetch the article HTML with more realistic browser headers
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'Referer': 'https://www.google.com/',
      },
      timeout: 15000, // 15 second timeout
      maxRedirects: 5,
      // Add response type to handle different content encodings
      responseType: 'text',
      decompress: true,
    });

    if (!response.data) {
      return res.status(404).json({ message: 'No content found at the provided URL' });
    }

    // Parse HTML with JSDOM
    const dom = new JSDOM(response.data, {
      url: url,
    });

    // Use Readability to extract the main content
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return res.status(422).json({
        message: 'Unable to extract readable content from this article. The page may not contain article content or may be behind a paywall.'
      });
    }

    // Clean up the DOM
    dom.window.close();

    // Return the parsed article content
    res.json({
      title: article.title,
      content: article.content,
      textContent: article.textContent,
      length: article.length,
      excerpt: article.excerpt,
      byline: article.byline,
      dir: article.dir,
      siteName: article.siteName,
      lang: article.lang,
    });

  } catch (error) {
    console.error('Error fetching article:', error);

    // Import axios dynamically to check for axios errors
    const { default: axios } = await import('axios');

    // Handle specific error types
    if (axios.isAxiosError(error)) {
      if (error.code === 'ENOTFOUND') {
        return res.status(404).json({ message: 'Article URL not found' });
      }
      if (error.code === 'ECONNABORTED') {
        return res.status(408).json({ message: 'Request timeout - the article took too long to load' });
      }
      if (error.response?.status === 403) {
        return res.status(403).json({
          message: 'Access denied - the website may be blocking automated requests. Try reading the article directly on the source website.',
          url: url
        });
      }
      if (error.response?.status === 404) {
        return res.status(404).json({ message: 'Article not found at the provided URL' });
      }
      if (error.response?.status === 429) {
        return res.status(429).json({ message: 'Rate limited - too many requests to this website' });
      }
      if (error.response?.status && error.response.status >= 500) {
        return res.status(502).json({ message: 'The article website is currently unavailable' });
      }
    }

    // Generic error response
    res.status(500).json({
      message: 'Failed to fetch article content. Please check the URL and try again.'
    });
  }
}

async function handleDatabaseEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  const { action: queryAction } = req.query;

  switch (queryAction) {
    case 'ping':
      return handlePing(req, res);
    case 'check':
      return handleCheckDb(req, res);
    case 'init':
      return handleInitDb(req, res);
    case 'test':
      return handleTestDb(req, res);
    case 'test-steps':
      return handleTestDbSteps(req, res);
    case 'initialize-sources':
      return handleInitializeSources(req, res);
    case 'remove-test-source':
      return handleRemoveTestSource(req, res);
    default:
      return res.status(400).json({
        error: 'Invalid action',
        availableActions: ['ping', 'check', 'init', 'test', 'test-steps', 'initialize-sources', 'remove-test-source']
      });
  }
}

// Ping functionality
async function handlePing(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  res.json({
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
}

// Check database functionality
async function handleCheckDb(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Starting database check...');

    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        error: 'DATABASE_URL environment variable is required'
      });
    }

    // Import modules dynamically
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql } = await import('drizzle-orm');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    // Test basic connectivity
    const result = await db.execute(sql`SELECT NOW() as current_time`);
    const currentTime = result.rows[0]?.current_time;

    // Check table existence
    const tableCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('articles', 'bookmarks', 'rss_sources', 'vulnerabilities')
      ORDER BY table_name
    `);

    const existingTables = tableCheck.rows.map(row => row.table_name);
    const expectedTables = ['articles', 'bookmarks', 'rss_sources', 'vulnerabilities'];
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));

    // Count records in each existing table
    const tableCounts: Record<string, number> = {};
    for (const table of existingTables) {
      try {
        const countResult = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
        tableCounts[table as string] = parseInt(countResult.rows[0]?.count as string || '0');
      } catch (error) {
        tableCounts[table as string] = -1; // Error counting
      }
    }

    res.json({
      status: 'success',
      database: {
        connected: true,
        currentTime,
        url: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'hidden'}` : null
      },
      tables: {
        existing: existingTables,
        missing: missingTables,
        counts: tableCounts
      },
      recommendations: missingTables.length > 0 ? [
        'Run database initialization to create missing tables',
        'Check that your database schema is up to date'
      ] : [
        'Database appears to be properly configured'
      ]
    });

  } catch (error) {
    console.error("Database check failed:", error);
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown database error',
      database: {
        connected: false
      }
    });
  }
}

// Initialize database functionality
async function handleInitDb(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Starting database initialization...');

    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        error: 'DATABASE_URL environment variable is required'
      });
    }

    // Import modules dynamically
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql } = await import('drizzle-orm');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    console.log('Creating tables...');

    // Create articles table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS articles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        summary TEXT,
        url TEXT NOT NULL UNIQUE,
        source TEXT NOT NULL,
        source_icon TEXT,
        published_at TIMESTAMP WITH TIME ZONE NOT NULL,
        threat_level TEXT NOT NULL DEFAULT 'MEDIUM',
        tags TEXT[] DEFAULT '{}',
        read_time INTEGER DEFAULT 5,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('Articles table created/verified');

    // Create bookmarks table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('Bookmarks table created/verified');

    // Create rss_sources table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rss_sources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        url TEXT NOT NULL UNIQUE,
        icon TEXT,
        color TEXT,
        is_active BOOLEAN DEFAULT true,
        last_fetched TIMESTAMP WITH TIME ZONE
      )
    `);
    console.log('RSS sources table created/verified');

    // Create vulnerabilities table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS vulnerabilities (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        published_date TIMESTAMP WITH TIME ZONE NOT NULL,
        last_modified_date TIMESTAMP WITH TIME ZONE NOT NULL,
        vuln_status TEXT NOT NULL,
        cvss_v3_score TEXT,
        cvss_v3_severity TEXT,
        cvss_v2_score TEXT,
        cvss_v2_severity TEXT,
        weaknesses TEXT[] DEFAULT '{}',
        reference_urls JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('Vulnerabilities table created/verified');

    // Create user_source_preferences table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_source_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_id UUID NOT NULL REFERENCES rss_sources(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, source_id)
      )
    `);
    console.log('User source preferences table created/verified');

    // Create indexes for better performance
    console.log('Creating indexes...');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_articles_threat_level ON articles(threat_level)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_bookmarks_article_id ON bookmarks(article_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(cvss_v3_severity)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_vulnerabilities_modified ON vulnerabilities(last_modified_date DESC)
    `);

    // Create indexes for user_source_preferences
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_user_source_preferences_user_id ON user_source_preferences(user_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_user_source_preferences_source_id ON user_source_preferences(source_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_user_source_preferences_active ON user_source_preferences(is_active)
    `);

    console.log('Database initialization completed successfully');

    res.json({
      message: 'Database initialized successfully',
      tables: ['articles', 'bookmarks', 'rss_sources', 'vulnerabilities', 'user_source_preferences'],
      indexes: [
        'idx_articles_source',
        'idx_articles_published_at',
        'idx_articles_threat_level',
        'idx_bookmarks_article_id',
        'idx_vulnerabilities_severity',
        'idx_vulnerabilities_modified',
        'idx_user_source_preferences_user_id',
        'idx_user_source_preferences_source_id',
        'idx_user_source_preferences_active'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Database initialization failed:", error);
    res.status(500).json({
      message: "Failed to initialize database",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleRemoveTestSource(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        error: 'DATABASE_URL environment variable is required'
      });
    }

    // Import modules dynamically
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql } = await import('drizzle-orm');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    // Remove any source with "Test" in the name
    const result = await db.execute(sql`
      DELETE FROM rss_sources 
      WHERE name ILIKE '%test%' OR url ILIKE '%test%'
    `);

    res.json({
      message: `Successfully removed ${result.rowCount || 0} test sources`,
      removedCount: result.rowCount || 0
    });

  } catch (error) {
    console.error("Error removing test sources:", error);
    res.status(500).json({
      message: "Failed to remove test sources",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Test database functionality
async function handleTestDb(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        error: 'DATABASE_URL environment variable is required'
      });
    }

    // Import modules dynamically
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql } = await import('drizzle-orm');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    // Test database connection
    const result = await db.execute(sql`SELECT 'Database connection successful' as message, NOW() as timestamp`);

    res.json({
      status: 'success',
      message: result.rows[0]?.message,
      timestamp: result.rows[0]?.timestamp,
      database_url_configured: !!process.env.DATABASE_URL
    });

  } catch (error) {
    console.error("Database test failed:", error);
    res.status(500).json({
      status: 'error',
      message: "Database connection failed",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Test database steps functionality
async function handleTestDbSteps(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const steps: Array<{ step: string; status: string; message?: string; error?: string }> = [];

  try {
    // Step 1: Check environment variable
    steps.push({
      step: 'Environment Check',
      status: process.env.DATABASE_URL ? 'success' : 'failed',
      message: process.env.DATABASE_URL ? 'DATABASE_URL is configured' : 'DATABASE_URL is missing'
    });

    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ steps });
    }

    // Step 2: Import modules
    try {
      await import('drizzle-orm/neon-serverless');
      await import('@neondatabase/serverless');
      await import('drizzle-orm');
      steps.push({
        step: 'Module Import',
        status: 'success',
        message: 'All required modules imported successfully'
      });
    } catch (error) {
      steps.push({
        step: 'Module Import',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return res.status(500).json({ steps });
    }

    // Step 3: Create connection
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql } = await import('drizzle-orm');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    steps.push({
      step: 'Connection Setup',
      status: 'success',
      message: 'Database connection pool created'
    });

    // Step 4: Test query
    try {
      const result = await db.execute(sql`SELECT NOW() as current_time, version() as db_version`);
      steps.push({
        step: 'Database Query',
        status: 'success',
        message: `Query successful at ${result.rows[0]?.current_time}`
      });
    } catch (error) {
      steps.push({
        step: 'Database Query',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return res.status(500).json({ steps });
    }

    res.json({
      status: 'success',
      message: 'All database tests passed',
      steps
    });

  } catch (error) {
    steps.push({
      step: 'Unexpected Error',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      status: 'error',
      message: 'Database test failed',
      steps
    });
  }
}

// Initialize sources functionality
async function handleInitializeSources(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        error: 'DATABASE_URL environment variable is required'
      });
    }

    // Import modules dynamically
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { Pool } = await import('@neondatabase/serverless');
    const { sql } = await import('drizzle-orm');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    const defaultSources = [
      {
        name: "Bleeping Computer",
        url: "https://www.bleepingcomputer.com/feed/",
        icon: "fas fa-exclamation",
        color: "#ef4444"
      },
      {
        name: "The Hacker News",
        url: "https://feeds.feedburner.com/TheHackersNews",
        icon: "fas fa-user-secret",
        color: "#f97316"
      },
      {
        name: "Dark Reading",
        url: "https://www.darkreading.com/rss_simple.asp",
        icon: "fas fa-eye",
        color: "#8b5cf6"
      },
      {
        name: "CrowdStrike Blog",
        url: "https://www.crowdstrike.com/blog/feed/",
        icon: "fas fa-crow",
        color: "#dc2626"
      },
      {
        name: "Unit 42",
        url: "https://unit42.paloaltonetworks.com/feed/",
        icon: "fas fa-shield-virus",
        color: "#2563eb"
      },
      {
        name: "The DFIR Report",
        url: "https://thedfirreport.com/feed/",
        icon: "fas fa-search",
        color: "#16a34a"
      }
    ];

    let insertedCount = 0;
    const errors: string[] = [];

    for (const source of defaultSources) {
      try {
        await db.execute(sql`
          INSERT INTO rss_sources (name, url, icon, color, is_active)
          VALUES (${source.name}, ${source.url}, ${source.icon}, ${source.color}, true)
          ON CONFLICT (name) DO NOTHING
        `);
        insertedCount++;
      } catch (error) {
        errors.push(`Failed to insert ${source.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    res.json({
      message: `Successfully initialized ${insertedCount} RSS sources`,
      sourcesInitialized: insertedCount,
      totalSources: defaultSources.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Initialize sources error:', error);
    res.status(500).json({ error: 'Failed to initialize sources' });
  }
}

async function handleUserOnboardingEndpoints(req: VercelRequest, res: VercelResponse, action: string) {
  // Check authentication
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Initialize storage
  const { PostgresStorage } = await import('../server/postgres-storage.js');
  const storage = new PostgresStorage();

  if (req.method === 'POST') {
    try {
      const { role, topics, sourceIds } = req.body;
      console.log('Onboarding submission received:', { userId, role, topics, sourceIds });

      // Validate input
      if (!role || !Array.isArray(topics) || !Array.isArray(sourceIds)) {
        console.error('Invalid onboarding data:', { role, topics, sourceIds });
        return res.status(400).json({ message: 'Invalid onboarding data' });
      }

      // Update user profile with role and topics
      console.log('Updating user onboarding...');
      const updatedUser = await storage.updateUserOnboarding(userId, { role, topics });
      console.log('User onboarding updated:', updatedUser);

      // Handle source preferences
      // First, clear existing preferences for this user (if any)
      console.log('Getting existing preferences...');
      const existingPrefs = await storage.getUserSourcePreferences(userId);
      console.log('Existing preferences:', existingPrefs);

      for (const pref of existingPrefs) {
        await storage.deleteUserSourcePreference(userId, pref.sourceId);
      }

      // Add new source preferences
      console.log('Creating new source preferences...');
      const preferencePromises = sourceIds.map((sourceId: string) =>
        storage.createUserSourcePreference({
          userId,
          sourceId,
          isActive: true
        })
      );

      await Promise.all(preferencePromises);
      console.log('Source preferences created successfully');

      return res.status(200).json({
        message: 'Onboarding completed successfully',
        user: updatedUser
      });

    } catch (error) {
      console.error('Error in onboarding:', error);
      return res.status(500).json({
        message: 'Failed to complete onboarding',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

