import type { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { pgTable, serial, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import * as crypto from 'crypto';

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

// Admin email from environment variable
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'achuthchandra07@gmail.com'; // Fallback for development only

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
  const db = getDb();
  
  try {
    const allUsers = await db.select().from(users);
    
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
    
    // Get the 10 most recent logins
    const recentUsers = [...allUsers]
      .sort((a, b) => new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime())
      .slice(0, 10)
      .map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || null,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      }));
    
    return {
      totalUsers,
      recentLogins,
      newUserCount,
      activeUsersWeek,
      recentUsers,
    };
  } catch (error) {
    console.error('Error in getUserStatistics:', error);
    // Return default values if there's an error (e.g., table doesn't exist)
    return {
      totalUsers: 0,
      recentLogins: 0,
      newUserCount: 0,
      activeUsersWeek: 0,
      recentUsers: [],
    };
  }
}

/**
 * Get all users (for admin purposes)
 * @returns All users in the system
 */
async function getAllUsers(): Promise<UserLoginRecord[]> {
  const db = getDb();
  
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
    }));
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    // Return empty array if there's an error (e.g., table doesn't exist)
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        error: 'Database not configured',
        message: 'DATABASE_URL environment variable is not set'
      });
    }

    // For GET requests, we need to check authorization
    if (req.method === 'GET') {
      // Get authorization header
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
    } else {
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