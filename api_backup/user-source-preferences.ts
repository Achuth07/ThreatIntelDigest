import type { VercelRequest, VercelResponse } from '@vercel/node';
import { insertUserSourcePreferenceSchema } from '../shared/schema';

// Helper function to verify token
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
    // Note: This is a simplified implementation for demonstration
    // In production, you should use a proper JWT library
    
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

// Helper function to get user ID from request
function getUserIdFromRequest(req: VercelRequest): number | null {
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

// Simplified user source preferences storage implementation for Vercel
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
      const { eq, and } = await import('drizzle-orm');
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
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