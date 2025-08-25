import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PostgresStorage } from '../server/postgres-storage';
import { insertBookmarkSchema } from '../shared/schema';

const storage = new PostgresStorage();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const { export: isExport } = req.query;
      
      if (isExport === 'true') {
        // Export bookmarks with full article details
        const bookmarksWithArticles = await storage.getBookmarksWithArticles();
        
        // Format for export
        const exportData = {
          exportedAt: new Date().toISOString(),
          totalBookmarks: bookmarksWithArticles.length,
          bookmarks: bookmarksWithArticles.map(item => ({
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
        const bookmarks = await storage.getBookmarks();
        res.json(bookmarks);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookmarks" });
    }
  } else if (req.method === 'POST') {
    try {
      const validatedData = insertBookmarkSchema.parse(req.body);
      const bookmark = await storage.createBookmark(validatedData);
      res.status(201).json(bookmark);
    } catch (error) {
      res.status(400).json({ message: "Invalid bookmark data" });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { pathname } = new URL(req.url!, `https://${req.headers.host}`);
      const articleId = pathname.split('/').pop();
      
      if (!articleId) {
        return res.status(400).json({ message: "Article ID is required" });
      }
      
      const deleted = await storage.deleteBookmark(articleId);
      
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