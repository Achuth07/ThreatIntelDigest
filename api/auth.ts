import { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { pgTable, serial, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';

// Define the users table schema directly
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  googleId: varchar('google_id', { length: 255 }).unique().notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at').defaultNow().notNull(),
});

// Simple interface for user tracking data
interface UserLoginRecord {
  id: number;
  googleId: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: Date;
  lastLoginAt: Date;
}

/**
 * Get database connection
 * @returns Database connection
 */
function getDb() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new Pool({ connectionString });
  return drizzle(pool);
}

/**
 * Initialize the users table if it doesn't exist
 */
async function initializeUsersTable() {
  const db = getDb();
  
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
  const db = getDb();
  
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
      };
    }
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw error;
  }
}

async function handleGoogleCallback(req: VercelRequest, res: VercelResponse) {
  const { code } = req.query;
  
  if (!code) {
    // If there's no code, redirect to the frontend with an error
    res.redirect('https://threatfeed.whatcyber.com?error=authentication_failed');
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
        redirect_uri: 'https://threatfeed.whatcyber.com/api/auth?action=callback',
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
    
    // Prepare user data for frontend
    const userData = {
      id: user.id,
      googleId: user.googleId,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    };
    
    // Redirect to frontend with user data (URL encoded)
    const userDataString = encodeURIComponent(JSON.stringify(userData));
    res.redirect(`https://threatfeed.whatcyber.com?user=${userDataString}`);
  } catch (error) {
    console.error('Authentication error:', error);
    res.redirect('https://threatfeed.whatcyber.com?error=authentication_failed');
  }
}

async function handleGoogleLogin(req: VercelRequest, res: VercelResponse) {
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID || ''}` +
    `&redirect_uri=https://threatfeed.whatcyber.com/api/auth?action=callback` +
    `&response_type=code` +
    `&scope=openid%20email%20profile` +
    `&access_type=offline`;
  
  res.redirect(googleAuthUrl);
}

// Handler for checking authentication status
async function handleAuthStatus(req: VercelRequest, res: VercelResponse) {
  // Since we're using localStorage for authentication data in the frontend,
  // we can't actually check a server-side session state in this simple implementation.
  // In a real implementation, we would check the session or JWT here.
  // For now, we'll return a response indicating the frontend should check localStorage.
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  const { action } = req.query;
  
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