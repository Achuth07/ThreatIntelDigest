import { getDb } from './db.js';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

// Simple interface for user tracking data
export interface UserLoginRecord {
  id: number;
  googleId: string | null;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: Date;
  lastLoginAt: Date;
}

/**
 * Get or create a user record in the database
 * @param googleId Google user ID
 * @param name User's name
 * @param email User's email
 * @param avatar User's avatar URL
 * @returns User record
 */
export async function getOrCreateUser(googleId: string, name: string, email: string, avatar: string | null): Promise<UserLoginRecord> {
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

/**
 * Get user statistics
 * @returns User statistics including total users, recent logins, etc.
 */
export async function getUserStatistics() {
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
export async function getAllUsers(): Promise<UserLoginRecord[]> {
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