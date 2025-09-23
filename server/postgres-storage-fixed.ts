import { and, desc, asc, ilike, inArray, eq } from 'drizzle-orm';
import { getDb } from './db';
import { articles, bookmarks, rssSources, vulnerabilities } from '../shared/schema';
import type { IStorage } from './storage';
import type { Article, InsertArticle, Bookmark, InsertBookmark, RssSource, InsertRssSource } from '../shared/schema';

export class PostgresStorage implements IStorage {
  private db = getDb();

  constructor() {
    this.initializeDefaultSources();
  }

  private async initializeDefaultSources() {
    try {
      const existingSources = await this.db.select().from(rssSources);
      
      if (existingSources.length === 0) {
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

        for (const source of defaultSources) {
          await this.createRssSource(source);
        }
      }
    } catch (error) {
      console.error('Error initializing default sources:', error);
    }
  }

  // Articles
  async getArticles(params?: { source?: string; limit?: number; offset?: number; search?: string; sortBy?: string }): Promise<Article[]> {
    try {
      let queryBuilder = this.db.select().from(articles);
      
      const conditions = [];
      
      if (params?.source && params.source !== "all") {
        conditions.push(eq(articles.source, params.source));
      }

      if (params?.search) {
        const searchTerm = `%${params.search.toLowerCase()}%`;
        conditions.push(
          ilike(articles.title, searchTerm)
        );
      }

      if (conditions.length > 0) {
        queryBuilder = queryBuilder.where(and(...conditions)) as typeof queryBuilder;
      }

      // Apply sorting
      const sortBy = params?.sortBy || "newest";
      if (sortBy === "oldest") {
        queryBuilder = queryBuilder.orderBy(asc(articles.publishedAt)) as typeof queryBuilder;
      } else {
        queryBuilder = queryBuilder.orderBy(desc(articles.publishedAt)) as typeof queryBuilder;
      }

      // Apply pagination
      const limit = params?.limit || 20;
      const offset = params?.offset || 0;
      queryBuilder = queryBuilder.limit(limit).offset(offset) as typeof queryBuilder;

      return await queryBuilder;
    } catch (error) {
      console.error('Error fetching articles:', error);
      return [];
    }
  }

  async getArticle(id: string): Promise<Article | undefined> {
    try {
      const result = await this.db.select().from(articles).where(eq(articles.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching article:', error);
      return undefined;
    }
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    try {
      const articleData: any = {
        title: insertArticle.title,
        summary: insertArticle.summary || null,
        url: insertArticle.url,
        source: insertArticle.source,
        sourceIcon: insertArticle.sourceIcon || null,
        publishedAt: insertArticle.publishedAt,
        threatLevel: insertArticle.threatLevel || "MEDIUM",
        tags: (insertArticle.tags ? [...(insertArticle.tags as string[])] : []) as string[],
        readTime: insertArticle.readTime || 5,
      };
      
      const result = await this.db.insert(articles).values(articleData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating article:', error);
      throw error;
    }
  }

  async deleteArticle(id: string): Promise<boolean> {
    try {
      const result = await this.db.delete(articles).where(eq(articles.id, id));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting article:', error);
      return false;
    }
  }

  // Bookmarks
  async getBookmarks(): Promise<Bookmark[]> {
    try {
      return await this.db.select().from(bookmarks).orderBy(desc(bookmarks.createdAt));
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      return [];
    }
  }

  async getBookmarksWithArticles(): Promise<{ bookmark: Bookmark; article: Article }[]> {
    try {
      const result = await this.db
        .select({
          bookmark: bookmarks,
          article: articles
        })
        .from(bookmarks)
        .innerJoin(articles, eq(bookmarks.articleId, articles.id))
        .orderBy(desc(bookmarks.createdAt));
      
      return result.map(row => ({
        bookmark: row.bookmark,
        article: row.article
      }));
    } catch (error) {
      console.error('Error fetching bookmarks with articles:', error);
      return [];
    }
  }

  async createBookmark(insertBookmark: InsertBookmark): Promise<Bookmark> {
    try {
      const result = await this.db.insert(bookmarks).values(insertBookmark as any).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating bookmark:', error);
      throw error;
    }
  }

  async deleteBookmark(articleId: string): Promise<boolean> {
    try {
      const result = await this.db.delete(bookmarks).where(eq(bookmarks.articleId, articleId));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      return false;
    }
  }

  async isBookmarked(articleId: string): Promise<boolean> {
    try {
      const result = await this.db.select({ id: bookmarks.id }).from(bookmarks).where(eq(bookmarks.articleId, articleId)).limit(1);
      return result.length > 0;
    } catch (error) {
      console.error('Error checking if article is bookmarked:', error);
      return false;
    }
  }

  // RSS Sources
  async getRssSources(): Promise<RssSource[]> {
    try {
      return await this.db.select().from(rssSources).where(eq(rssSources.isActive, true));
    } catch (error) {
      console.error('Error fetching RSS sources:', error);
      return [];
    }
  }

  async getAllRssSources(): Promise<RssSource[]> {
    try {
      return await this.db.select().from(rssSources);
    } catch (error) {
      console.error('Error fetching all RSS sources:', error);
      return [];
    }
  }

  async getRssSource(id: string): Promise<RssSource | undefined> {
    try {
      const result = await this.db.select().from(rssSources).where(eq(rssSources.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching RSS source:', error);
      return undefined;
    }
  }

  async createRssSource(insertRssSource: InsertRssSource): Promise<RssSource> {
    try {
      const result = await this.db.insert(rssSources).values(insertRssSource as any).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating RSS source:', error);
      throw error;
    }
  }

  async updateRssSource(id: string, updateRssSource: Partial<InsertRssSource>): Promise<RssSource> {
    try {
      const result = await this.db.update(rssSources).set(updateRssSource as any).where(eq(rssSources.id, id)).returning();
      return result[0];
    } catch (error) {
      console.error('Error updating RSS source:', error);
      throw error;
    }
  }

  async deleteRssSource(id: string): Promise<boolean> {
    try {
      // Instead of deleting, we'll just set isActive to false
      const result = await this.db.update(rssSources).set({ isActive: false }).where(eq(rssSources.id, id));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting RSS source:', error);
      return false;
    }
  }

  // CVEs
  async getCVEs(params?: { limit?: number; offset?: number; severity?: string; sort?: string }): Promise<any[]> {
    try {
      let queryBuilder = this.db.select().from(vulnerabilities);
      
      const conditions = [];
      
      if (params?.severity) {
        conditions.push(eq(vulnerabilities.cvssV3Severity, params.severity));
      }

      if (conditions.length > 0) {
        queryBuilder = queryBuilder.where(and(...conditions)) as typeof queryBuilder;
      }

      // Apply sorting based on the sort parameter
      const sort = params?.sort || 'newest';
      switch (sort) {
        case 'relevant':
          // Sort by CVSS score (highest first) and then by published date
          queryBuilder = queryBuilder.orderBy(
            desc(sql`COALESCE(${vulnerabilities.cvssV3Score}, ${vulnerabilities.cvssV2Score})`), 
            desc(vulnerabilities.publishedDate)
          ) as typeof queryBuilder;
          break;
        case 'newest':
        default:
          // Sort by published date (newest first)
          queryBuilder = queryBuilder.orderBy(desc(vulnerabilities.publishedDate)) as typeof queryBuilder;
          break;
      }

      // Apply pagination
      const limit = params?.limit || 20;
      const offset = params?.offset || 0;
      queryBuilder = queryBuilder.limit(limit).offset(offset) as typeof queryBuilder;

      return await queryBuilder;
    } catch (error) {
      console.error('Error fetching CVEs:', error);
      return [];
    }
  }

  async getCVE(id: string): Promise<any | undefined> {
    try {
      const result = await this.db.select().from(vulnerabilities).where(eq(vulnerabilities.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching CVE:', error);
      return undefined;
    }
  }

  async createCVE(insertCVE: any): Promise<any> {
    try {
      const result = await this.db.insert(vulnerabilities).values(insertCVE).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating CVE:', error);
      throw error;
    }
  }

  async cveExists(id: string): Promise<boolean> {
    try {
      const result = await this.db.select({ id: vulnerabilities.id }).from(vulnerabilities).where(eq(vulnerabilities.id, id)).limit(1);
      return result.length > 0;
    } catch (error) {
      console.error('Error checking if CVE exists:', error);
      return false;
    }
  }
}