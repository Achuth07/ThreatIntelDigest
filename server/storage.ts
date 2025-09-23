import { type Article, type InsertArticle, type Bookmark, type InsertBookmark, type RssSource, type InsertRssSource } from "@shared/schema";
import { randomUUID } from "crypto";

// Define CVE types for in-memory storage
interface CVE {
  id: string;
  description: string;
  publishedDate: Date;
  lastModifiedDate: Date;
  vulnStatus: string;
  cvssV3Score: number | null;
  cvssV3Severity: string | null;
  cvssV2Score: number | null;
  cvssV2Severity: string | null;
  weaknesses: string[];
  references: { url: string; source: string; tags?: string[] }[];
  createdAt: Date;
}

interface InsertCVE {
  id: string;
  description: string;
  publishedDate: Date;
  lastModifiedDate: Date;
  vulnStatus: string;
  cvssV3Score?: number | null;
  cvssV3Severity?: string | null;
  cvssV2Score?: number | null;
  cvssV2Severity?: string | null;
  weaknesses?: string[];
  references?: { url: string; source: string; tags?: string[] }[];
}

// Re-export types for use in other files
export { type Article, type InsertArticle, type Bookmark, type InsertBookmark, type RssSource, type InsertRssSource, type CVE, type InsertCVE };

export interface IStorage {
  // Articles
  getArticles(params?: { source?: string; limit?: number; offset?: number; search?: string; sortBy?: string }): Promise<Article[]>;
  getArticle(id: string): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  deleteArticle(id: string): Promise<boolean>;
  
  // Bookmarks
  getBookmarks(userId?: number): Promise<Bookmark[]>;
  getBookmarksWithArticles(userId?: number): Promise<{ bookmark: Bookmark; article: Article }[]>;
  createBookmark(bookmark: InsertBookmark & { userId?: number }): Promise<Bookmark>;
  deleteBookmark(articleId: string, userId?: number): Promise<boolean>;
  isBookmarked(articleId: string, userId?: number): Promise<boolean>;
  
  // RSS Sources
  getRssSources(): Promise<RssSource[]>;
  getRssSource(id: string): Promise<RssSource | undefined>;
  createRssSource(source: InsertRssSource): Promise<RssSource>;
  updateRssSource(id: string, source: Partial<InsertRssSource>): Promise<RssSource | undefined>;
  deleteRssSource(id: string): Promise<boolean>;
  
  // CVE/Vulnerabilities
  getCVEs(params?: { limit?: number; offset?: number; severity?: string; sort?: string }): Promise<CVE[]>;
  getCVE(id: string): Promise<CVE | undefined>;
  createCVE(cve: InsertCVE): Promise<CVE>;
  cveExists(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private articles: Map<string, Article>;
  private bookmarks: Map<string, Bookmark>;
  private rssSources: Map<string, RssSource>;
  private cves: Map<string, CVE>;

  constructor() {
    this.articles = new Map();
    this.bookmarks = new Map();
    this.rssSources = new Map();
    this.cves = new Map();
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
      // Updated Cisco Talos Intelligence URL
      {
        name: "Cisco Talos Intelligence",
        url: "https://feeds.feedburner.com/feedburner/Talos",
        icon: "fas fa-network-wired",
        color: "#1ba0d7",
        isActive: true,
      },
      // New sources
      {
        name: "Cisco Threat Research Blog",
        url: "https://blogs.cisco.com/feed",
        icon: "fas fa-network-wired",
        color: "#1ba0d7",
        isActive: true,
      },
      {
        name: "Check Point Research",
        url: "https://research.checkpoint.com/category/threat-research/feed/",
        icon: "fas fa-shield-alt",
        color: "#4285f4",
        isActive: true,
      },
      // Moved from Government & Agency Alerts to Vendor & Private Threat Research
      {
        name: "Juniper Networks Threat Research",
        url: "https://blogs.juniper.net/threat-research/feed",
        icon: "fas fa-network-wired",
        color: "#1ba0d7",
        isActive: true,
      },
      // Additional important sources
      {
        name: "Krebs on Security",
        url: "https://krebsonsecurity.com/feed/",
        icon: "fas fa-user-tie",
        color: "#059669",
        isActive: true,
      },
      {
        name: "US-Cert (Current Activity)",
        url: "https://us-cert.cisa.gov/ncas/current-activity.xml",
        icon: "fas fa-flag-usa",
        color: "#1e40af",
        isActive: true,
      },
      {
        name: "Google Project Zero",
        url: "https://googleprojectzero.blogspot.com/feeds/posts/default",
        icon: "fas fa-google",
        color: "#4285f4",
        isActive: true,
      },
      {
        name: "Microsoft Security Blog",
        url: "https://www.microsoft.com/en-us/security/blog/feed/",
        icon: "fas fa-microsoft",
        color: "#00bcf2",
        isActive: true,
      },
      // Moved from Legacy category
      {
        name: "Flashpoint",
        url: "https://flashpoint.io/feed/",
        icon: "fas fa-flash",
        color: "#f59e0b",
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
      tags: (insertArticle.tags ? [...(insertArticle.tags as string[])] : null) as string[] | null,
      readTime: insertArticle.readTime ?? null,
      threatLevel: insertArticle.threatLevel ?? "MEDIUM",
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
  async getBookmarks(userId?: number): Promise<Bookmark[]> {
    // For in-memory storage, we don't have user-specific bookmarks
    // This is just for interface compatibility
    return Array.from(this.bookmarks.values());
  }

  async getBookmarksWithArticles(userId?: number): Promise<{ bookmark: Bookmark; article: Article }[]> {
    const result: { bookmark: Bookmark; article: Article }[] = [];
    
    for (const bookmark of Array.from(this.bookmarks.values())) {
      const article = this.articles.get(bookmark.articleId);
      if (article) {
        result.push({ bookmark, article });
      }
    }
    
    // Sort by bookmark creation date (newest first)
    return result.sort((a, b) => 
      new Date(b.bookmark.createdAt || 0).getTime() - new Date(a.bookmark.createdAt || 0).getTime()
    );
  }

  async createBookmark(insertBookmark: InsertBookmark & { userId?: number }): Promise<Bookmark> {
    const id = randomUUID();
    const bookmark: Bookmark = { 
      ...insertBookmark, 
      id,
      createdAt: new Date(),
    };
    this.bookmarks.set(id, bookmark);
    return bookmark;
  }

  async deleteBookmark(articleId: string, userId?: number): Promise<boolean> {
    // For in-memory storage, we don't have user-specific bookmarks
    // This is just for interface compatibility
    for (const [id, bookmark] of Array.from(this.bookmarks.entries())) {
      if (bookmark.articleId === articleId) {
        return this.bookmarks.delete(id);
      }
    }
    return false;
  }

  async isBookmarked(articleId: string, userId?: number): Promise<boolean> {
    // For in-memory storage, we don't have user-specific bookmarks
    // This is just for interface compatibility
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

  // CVE/Vulnerabilities
  async getCVEs(params?: { limit?: number; offset?: number; severity?: string; sort?: string }): Promise<CVE[]> {
    let cves = Array.from(this.cves.values());
    
    // Filter by severity if provided
    if (params?.severity) {
      const severityUpper = params.severity.toUpperCase();
      cves = cves.filter(cve => 
        cve.cvssV3Severity === severityUpper || cve.cvssV2Severity === severityUpper
      );
    }
    
    // Sort based on the sort parameter
    const sort = params?.sort || 'newest';
    switch (sort) {
      case 'relevant':
        // Sort by CVSS score (highest first) and then by last modified date
        cves.sort((a, b) => {
          // Get the highest CVSS score for each CVE
          const scoreA = Math.max(
            a.cvssV3Score || 0,
            a.cvssV2Score || 0
          );
          
          const scoreB = Math.max(
            b.cvssV3Score || 0,
            b.cvssV2Score || 0
          );
          
          // Sort by score descending, then by last modified date descending
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }
          return new Date(b.lastModifiedDate).getTime() - new Date(a.lastModifiedDate).getTime();
        });
        break;
      case 'newest':
      default:
        // Sort by published date (newest first)
        cves.sort((a, b) => 
          new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
        );
        break;
    }
    
    // Apply pagination
    const offset = params?.offset || 0;
    const limit = params?.limit || 50;
    return cves.slice(offset, offset + limit);
  }

  async getCVE(id: string): Promise<CVE | undefined> {
    return this.cves.get(id);
  }

  async createCVE(insertCVE: InsertCVE): Promise<CVE> {
    const cve: CVE = {
      ...insertCVE,
      cvssV3Score: insertCVE.cvssV3Score ?? null,
      cvssV3Severity: insertCVE.cvssV3Severity ?? null,
      cvssV2Score: insertCVE.cvssV2Score ?? null,
      cvssV2Severity: insertCVE.cvssV2Severity ?? null,
      weaknesses: insertCVE.weaknesses ?? [],
      references: insertCVE.references ?? [],
      createdAt: new Date(),
    };
    this.cves.set(cve.id, cve);
    return cve;
  }

  async cveExists(id: string): Promise<boolean> {
    return this.cves.has(id);
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
