import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertArticleSchema, insertBookmarkSchema, insertRssSourceSchema } from "@shared/schema";
import Parser from "rss-parser";
import axios from "axios";

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
            ...source, 
            lastFetched: new Date() 
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
      const bookmarks = await storage.getBookmarks();
      res.json(bookmarks);
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
