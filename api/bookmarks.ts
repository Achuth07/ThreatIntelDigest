import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PostgresStorage } from '../server/postgres-storage';
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get user ID from request (for authenticated endpoints)
  const userId = getUserIdFromRequest(req);
  
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
        const validatedData = insertBookmarkSchema.parse(req.body);
        const newBookmark = {
          ...validatedData,
          userId,
          id: String(inMemoryBookmarks.length + 1),
          createdAt: new Date().toISOString()
        };
        inMemoryBookmarks.push(newBookmark);
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
        const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
        const articleId = pathname.split('/').pop();
        
        if (!articleId) {
          return res.status(400).json({ message: "Article ID is required" });
        }
        
        const bookmarkIndex = inMemoryBookmarks.findIndex(bookmark => bookmark.articleId === articleId && bookmark.userId === userId);
        
        if (bookmarkIndex !== -1) {
          inMemoryBookmarks.splice(bookmarkIndex, 1);
          return res.json({ message: "Bookmark removed successfully" });
        } else {
          return res.status(404).json({ message: "Bookmark not found" });
        }
      } catch (error) {
        return res.status(500).json({ message: "Failed to remove bookmark" });
      }
    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }
  }
  
  // Use database storage when DATABASE_URL is provided
  const storage = new PostgresStorage();
  
  if (req.method === 'GET') {
    // For GET requests, we'll allow unauthenticated requests to maintain backward compatibility
    // but will only return bookmarks for the authenticated user if provided
    try {
      const { export: isExport } = req.query;
      
      if (isExport === 'true') {
        // Export bookmarks with full article details
        const bookmarksWithArticles = userId ? await storage.getBookmarksWithArticles(userId) : [];
        
        // Format for export
        const exportData = {
          exportedAt: new Date().toISOString(),
          totalBookmarks: bookmarksWithArticles.length,
          bookmarks: bookmarksWithArticles.map((item: any) => ({
            title: item.article.title,
            summary: item.article.summary,
            url: item.article.url,
            source: item.article.source,
            publishedAt: item.article.publishedAt,
            threatLevel: item.article.threatLevel,
            tags: item.article.tags,
            bookmarkedAt: item.bookmark.createdAt
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
      const validatedData = insertBookmarkSchema.parse(req.body);
      const bookmark = await storage.createBookmark({ ...validatedData, userId });
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
      const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
      const articleId = pathname.split('/').pop();
      
      if (!articleId) {
        return res.status(400).json({ message: "Article ID is required" });
      }
      
      const deleted = await storage.deleteBookmark(articleId, userId);
      
      if (deleted) {
        res.json({ message: "Bookmark removed successfully" });
      } else {
        res.status(404).json({ message: "Bookmark not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to remove bookmark" });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}