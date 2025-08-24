import { type Article, type InsertArticle, type Bookmark, type InsertBookmark, type RssSource, type InsertRssSource } from "@shared/schema";
import { randomUUID } from "crypto";

// Re-export types for use in other files
export { type Article, type InsertArticle, type Bookmark, type InsertBookmark, type RssSource, type InsertRssSource };

export interface IStorage {
  // Articles
  getArticles(params?: { source?: string; limit?: number; offset?: number; search?: string; sortBy?: string }): Promise<Article[]>;
  getArticle(id: string): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  deleteArticle(id: string): Promise<boolean>;
  
  // Bookmarks
  getBookmarks(): Promise<Bookmark[]>;
  createBookmark(bookmark: InsertBookmark): Promise<Bookmark>;
  deleteBookmark(articleId: string): Promise<boolean>;
  isBookmarked(articleId: string): Promise<boolean>;
  
  // RSS Sources
  getRssSources(): Promise<RssSource[]>;
  getRssSource(id: string): Promise<RssSource | undefined>;
  createRssSource(source: InsertRssSource): Promise<RssSource>;
  updateRssSource(id: string, source: Partial<InsertRssSource>): Promise<RssSource | undefined>;
  deleteRssSource(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private articles: Map<string, Article>;
  private bookmarks: Map<string, Bookmark>;
  private rssSources: Map<string, RssSource>;

  constructor() {
    this.articles = new Map();
    this.bookmarks = new Map();
    this.rssSources = new Map();
    this.initializeDefaultSources();
  }

  private initializeDefaultSources() {
    const defaultSources: InsertRssSource[] = [
      {
        name: "Bleeping Computer",
        url: "https://www.bleepingcomputer.com/feed/",
        icon: "fas fa-exclamation",
        color: "#ef4444",
        isActive: true,
      },
      {
        name: "The Hacker News",
        url: "https://feeds.feedburner.com/TheHackersNews",
        icon: "fas fa-user-secret",
        color: "#f97316",
        isActive: true,
      },
      {
        name: "Dark Reading",
        url: "https://www.darkreading.com/rss_simple.asp",
        icon: "fas fa-eye",
        color: "#8b5cf6",
        isActive: true,
      },
      {
        name: "CrowdStrike Blog",
        url: "https://www.crowdstrike.com/blog/feed/",
        icon: "fas fa-crow",
        color: "#dc2626",
        isActive: true,
      },
      {
        name: "Unit 42",
        url: "https://unit42.paloaltonetworks.com/feed/",
        icon: "fas fa-shield-virus",
        color: "#2563eb",
        isActive: true,
      },
      {
        name: "The DFIR Report",
        url: "https://thedfirreport.com/feed/",
        icon: "fas fa-search",
        color: "#16a34a",
        isActive: true,
      },
    ];

    defaultSources.forEach(source => {
      this.createRssSource(source);
    });
  }

  // Articles
  async getArticles(params?: { source?: string; limit?: number; offset?: number; search?: string; sortBy?: string }): Promise<Article[]> {
    let articles = Array.from(this.articles.values());
    
    if (params?.source && params.source !== "all") {
      articles = articles.filter(article => article.source === params.source);
    }

    if (params?.search) {
      const searchTerm = params.search.toLowerCase();
      articles = articles.filter(article => 
        article.title.toLowerCase().includes(searchTerm) ||
        article.summary?.toLowerCase().includes(searchTerm) ||
        article.source.toLowerCase().includes(searchTerm)
      );
    }

    // Sort articles
    const sortBy = params?.sortBy || "newest";
    articles.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
        case "newest":
        default:
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
    });

    // Apply pagination
    const offset = params?.offset || 0;
    const limit = params?.limit || 20;
    return articles.slice(offset, offset + limit);
  }

  async getArticle(id: string): Promise<Article | undefined> {
    return this.articles.get(id);
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const id = randomUUID();
    const article: Article = { 
      ...insertArticle,
      summary: insertArticle.summary ?? null,
      sourceIcon: insertArticle.sourceIcon ?? null,
      tags: Array.isArray(insertArticle.tags) ? insertArticle.tags : null,
      readTime: insertArticle.readTime ?? null,
      id,
      createdAt: new Date(),
    };
    this.articles.set(id, article);
    return article;
  }

  async deleteArticle(id: string): Promise<boolean> {
    return this.articles.delete(id);
  }

  // Bookmarks
  async getBookmarks(): Promise<Bookmark[]> {
    return Array.from(this.bookmarks.values());
  }

  async createBookmark(insertBookmark: InsertBookmark): Promise<Bookmark> {
    const id = randomUUID();
    const bookmark: Bookmark = { 
      ...insertBookmark, 
      id,
      createdAt: new Date(),
    };
    this.bookmarks.set(id, bookmark);
    return bookmark;
  }

  async deleteBookmark(articleId: string): Promise<boolean> {
    for (const [id, bookmark] of Array.from(this.bookmarks.entries())) {
      if (bookmark.articleId === articleId) {
        return this.bookmarks.delete(id);
      }
    }
    return false;
  }

  async isBookmarked(articleId: string): Promise<boolean> {
    for (const bookmark of Array.from(this.bookmarks.values())) {
      if (bookmark.articleId === articleId) {
        return true;
      }
    }
    return false;
  }

  // RSS Sources
  async getRssSources(): Promise<RssSource[]> {
    return Array.from(this.rssSources.values());
  }

  async getRssSource(id: string): Promise<RssSource | undefined> {
    return this.rssSources.get(id);
  }

  async createRssSource(insertSource: InsertRssSource): Promise<RssSource> {
    const id = randomUUID();
    const source: RssSource = { 
      ...insertSource,
      icon: insertSource.icon ?? null,
      color: insertSource.color ?? null,
      isActive: insertSource.isActive ?? null,
      id,
      lastFetched: null,
    };
    this.rssSources.set(id, source);
    return source;
  }

  async updateRssSource(id: string, updateSource: Partial<InsertRssSource>): Promise<RssSource | undefined> {
    const existing = this.rssSources.get(id);
    if (!existing) return undefined;

    const updated: RssSource = { ...existing, ...updateSource };
    this.rssSources.set(id, updated);
    return updated;
  }

  async deleteRssSource(id: string): Promise<boolean> {
    return this.rssSources.delete(id);
  }
}

// Import PostgresStorage dynamically to avoid circular dependency
let PostgresStorage: any = null;

const getStorage = async (): Promise<IStorage> => {
  if (process.env.DATABASE_URL) {
    if (!PostgresStorage) {
      const module = await import('./postgres-storage');
      PostgresStorage = module.PostgresStorage;
    }
    return new PostgresStorage();
  }
  return new MemStorage();
};

// For now, use MemStorage by default, we'll update this in routes.ts
export const storage = new MemStorage();
