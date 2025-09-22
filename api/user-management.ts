import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

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
      recentUsers,
    };
  } catch (error) {
    console.error('Error in getUserStatistics:', error);
    throw error;
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
    throw error;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      // Check if user wants statistics or all users
      const { stats } = req.query;
      
      if (stats === 'true') {
        // Get user statistics
        const statsData = await getUserStatistics();
        res.status(200).json(statsData);
      } else {
        // Get all users
        const users = await getAllUsers();
        res.status(200).json(users);
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in user management endpoint:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}