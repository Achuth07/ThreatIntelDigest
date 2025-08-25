import type { Express } from "express";
import { createServer, type Server } from "http";
import { insertArticleSchema, insertBookmarkSchema, insertRssSourceSchema } from "@shared/schema";
import type { IStorage } from "./storage";
import { PostgresStorage } from "./postgres-storage";
import { MemStorage } from "./storage";
import Parser from "rss-parser";
import axios from "axios";
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

// Initialize storage based on environment
const storage: IStorage = process.env.DATABASE_URL ? new PostgresStorage() : new MemStorage();

const parser = new Parser();

export async function registerRoutes(app: Express): Promise<Server> {
  
  // RSS Sources
  app.get("/api/sources", async (req, res) => {
    try {
      const sources = await storage.getRssSources();
      res.json(sources);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch RSS sources" });
    }
  });

  app.post("/api/sources", async (req, res) => {
    try {
      const validatedData = insertRssSourceSchema.parse(req.body);
      const source = await storage.createRssSource(validatedData);
      res.status(201).json(source);
    } catch (error) {
      res.status(400).json({ message: "Invalid source data" });
    }
  });

  app.patch("/api/sources/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedSource = await storage.updateRssSource(id, updateData);
      
      if (updatedSource) {
        res.json(updatedSource);
      } else {
        res.status(404).json({ message: "Source not found" });
      }
    } catch (error) {
      res.status(400).json({ message: "Invalid update data" });
    }
  });

  // Articles
  app.get("/api/articles", async (req, res) => {
    try {
      const { source, limit, offset, search, sortBy } = req.query;
      const articles = await storage.getArticles({
        source: source as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        search: search as string,
        sortBy: sortBy as string,
      });

      // Get bookmark status for each article
      const articlesWithBookmarks = await Promise.all(
        articles.map(async (article) => ({
          ...article,
          isBookmarked: await storage.isBookmarked(article.id),
        }))
      );

      res.json(articlesWithBookmarks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch articles" });
    }
  });

  app.post("/api/articles", async (req, res) => {
    try {
      const validatedData = insertArticleSchema.parse(req.body);
      const article = await storage.createArticle(validatedData);
      res.status(201).json(article);
    } catch (error) {
      res.status(400).json({ message: "Invalid article data" });
    }
  });

  // Fetch RSS feeds
  app.post("/api/fetch-feeds", async (req, res) => {
    try {
      const sources = await storage.getRssSources();
      const activeFeeds = sources.filter(source => source.isActive);
      
      let totalFetched = 0;

      for (const source of activeFeeds) {
        try {
          const feed = await parser.parseURL(source.url);
          
          for (const item of feed.items.slice(0, 10)) { // Limit to 10 latest items per source
            if (!item.title || !item.link) continue;

            // Check if article already exists
            const existingArticles = await storage.getArticles({ search: item.title });
            const exists = existingArticles.some(article => article.title === item.title);
            
            if (!exists) {
              const threatLevel = determineThreatLevel(item.title || "", item.contentSnippet || "");
              const tags = extractTags(item.title || "", item.contentSnippet || "");
              
              await storage.createArticle({
                title: item.title,
                summary: item.contentSnippet || item.content?.substring(0, 300) + "..." || "",
                url: item.link,
                source: source.name,
                sourceIcon: source.icon || "fas fa-rss",
                publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
                threatLevel,
                tags,
                readTime: estimateReadTime(item.contentSnippet || item.content || ""),
              });
              
              totalFetched++;
            }
          }

          // Update last fetched timestamp
          await storage.updateRssSource(source.id, {
            name: source.name,
            url: source.url,
            icon: source.icon,
            color: source.color,
            isActive: source.isActive,
          });
          
        } catch (feedError) {
          console.error(`Error fetching feed for ${source.name}:`, feedError);
        }
      }

      res.json({ message: `Successfully fetched ${totalFetched} new articles` });
    } catch (error) {
      console.error("Error fetching feeds:", error);
      res.status(500).json({ message: "Failed to fetch RSS feeds" });
    }
  });

  // Bookmarks
  app.get("/api/bookmarks", async (req, res) => {
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
  });

  app.post("/api/bookmarks", async (req, res) => {
    try {
      const validatedData = insertBookmarkSchema.parse(req.body);
      const bookmark = await storage.createBookmark(validatedData);
      res.status(201).json(bookmark);
    } catch (error) {
      res.status(400).json({ message: "Invalid bookmark data" });
    }
  });

  app.delete("/api/bookmarks/:articleId", async (req, res) => {
    try {
      const { articleId } = req.params;
      const deleted = await storage.deleteBookmark(articleId);
      
      if (deleted) {
        res.json({ message: "Bookmark removed successfully" });
      } else {
        res.status(404).json({ message: "Bookmark not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to remove bookmark" });
    }
  });

  const httpServer = createServer(app);

  // Fetch Article Content
  app.get("/api/fetch-article", async (req, res) => {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ message: 'URL parameter is required' });
    }

    try {
      // Validate URL format
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ message: 'Invalid URL format' });
      }

      // Fetch the article HTML with a realistic User-Agent
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 15000, // 15 second timeout
        maxRedirects: 5,
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

      // Handle specific error types
      if (axios.isAxiosError(error)) {
        if (error.code === 'ENOTFOUND') {
          return res.status(404).json({ message: 'Article URL not found' });
        }
        if (error.code === 'ECONNABORTED') {
          return res.status(408).json({ message: 'Request timeout - the article took too long to load' });
        }
        if (error.response?.status === 403) {
          return res.status(403).json({ message: 'Access denied - the website may be blocking automated requests' });
        }
        if (error.response?.status === 404) {
          return res.status(404).json({ message: 'Article not found at the provided URL' });
        }
        if (error.response?.status === 429) {
          return res.status(429).json({ message: 'Rate limited - too many requests to this website' });
        }
        if (error.response?.status >= 500) {
          return res.status(502).json({ message: 'The article website is currently unavailable' });
        }
      }

      // Generic error response
      res.status(500).json({ 
        message: 'Failed to fetch article content. Please check the URL and try again.' 
      });
    }
  });

  return httpServer;
}

// Helper functions
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
