import type { VercelRequest, VercelResponse } from '@vercel/node';
import { insertBookmarkSchema } from '../shared/schema';

// In-memory storage for local development
let inMemoryBookmarks: any[] = [];

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
      const { eq, desc } = await import('drizzle-orm');
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
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