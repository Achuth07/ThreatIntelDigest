import { and, desc, asc, ilike, inArray, eq } from 'drizzle-orm';
import { getDb } from './db.js';
import { articles, bookmarks, rssSources, vulnerabilities, users, userSourcePreferences, userPreferences } from '../shared/schema.js';
import type { IStorage, CVE, InsertCVE } from './storage.js';
import type { Article, InsertArticle, Bookmark, InsertBookmark, RssSource, InsertRssSource } from '../shared/schema.js';
import type { User, InsertUser, UserSourcePreference, InsertUserSourcePreference, UserPreferences, InsertUserPreferences } from '../shared/schema.js';

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
      const articleData = {
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

  // Clean up old articles (older than 30 days)
  async cleanupOldArticles(): Promise<number> {
    try {
      // Calculate the date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Delete articles older than 30 days
      // This will automatically delete associated bookmarks due to foreign key constraints
      const result = await this.db.delete(articles).where(
        and(
          eq(articles.source, 'automated_cleanup'),
          // Delete articles older than 30 days
        )
      );
      
      console.log(`Cleaned up ${result.rowCount || 0} old articles`);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error cleaning up old articles:', error);
      return 0;
    }
  }

  // Bookmarks
  async getBookmarks(userId: number): Promise<Bookmark[]> {
    try {
      return await this.db.select().from(bookmarks).where(eq(bookmarks.userId, userId)).orderBy(desc(bookmarks.createdAt));
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      return [];
    }
  }

  async getBookmarksWithArticles(userId: number): Promise<{ bookmark: Bookmark; article: Article }[]> {
    try {
      const result = await this.db
        .select({
          bookmark: bookmarks,
          article: articles
        })
        .from(bookmarks)
        .innerJoin(articles, eq(bookmarks.articleId, articles.id))
        .where(eq(bookmarks.userId, userId))
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

  async createBookmark(insertBookmark: InsertBookmark & { userId: number }): Promise<Bookmark> {
    try {
      // Check if bookmark already exists for this user and article
      const existing = await this.db.select().from(bookmarks).where(
        and(
          eq(bookmarks.userId, insertBookmark.userId),
          eq(bookmarks.articleId, insertBookmark.articleId)
        )
      ).limit(1);
      
      // If bookmark already exists, return it
      if (existing.length > 0) {
        return existing[0];
      }
      
      const result = await this.db.insert(bookmarks).values(insertBookmark).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating bookmark:', error);
      throw error;
    }
  }

  async deleteBookmark(articleId: string, userId: number): Promise<boolean> {
    try {
      const result = await this.db.delete(bookmarks).where(and(eq(bookmarks.articleId, articleId), eq(bookmarks.userId, userId)));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      return false;
    }
  }

  async isBookmarked(articleId: string, userId: number): Promise<boolean> {
    try {
      const result = await this.db.select({ id: bookmarks.id }).from(bookmarks).where(and(eq(bookmarks.articleId, articleId), eq(bookmarks.userId, userId))).limit(1);
      return result.length > 0;
    } catch (error) {
      console.error('Error checking if article is bookmarked:', error);
      return false;
    }
  }

  // User Source Preferences
  async getUserSourcePreferences(userId: number): Promise<UserSourcePreference[]> {
    try {
      return await this.db.select().from(userSourcePreferences).where(eq(userSourcePreferences.userId, userId));
    } catch (error) {
      console.error('Error fetching user source preferences:', error);
      return [];
    }
  }

  async createUserSourcePreference(insertPreference: InsertUserSourcePreference): Promise<UserSourcePreference> {
    try {
      // Check if preference already exists
      const existing = await this.db.select().from(userSourcePreferences).where(
        and(
          eq(userSourcePreferences.userId, insertPreference.userId),
          eq(userSourcePreferences.sourceId, insertPreference.sourceId)
        )
      ).limit(1);
      
      // If preference already exists, update it
      if (existing.length > 0) {
        const result = await this.db.update(userSourcePreferences)
          .set({ 
            isActive: insertPreference.isActive ?? true,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(userSourcePreferences.userId, insertPreference.userId),
              eq(userSourcePreferences.sourceId, insertPreference.sourceId)
            )
          )
          .returning();
        return result[0];
      }
      
      // Create new preference
      const result = await this.db.insert(userSourcePreferences).values(insertPreference).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating user source preference:', error);
      throw error;
    }
  }

  async updateUserSourcePreference(userId: number, sourceId: string, updatePreference: Partial<InsertUserSourcePreference>): Promise<UserSourcePreference> {
    try {
      const result = await this.db.update(userSourcePreferences)
        .set(updatePreference)
        .where(
          and(
            eq(userSourcePreferences.userId, userId),
            eq(userSourcePreferences.sourceId, sourceId)
          )
        )
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating user source preference:', error);
      throw error;
    }
  }

  async deleteUserSourcePreference(userId: number, sourceId: string): Promise<boolean> {
    try {
      const result = await this.db.delete(userSourcePreferences)
        .where(
          and(
            eq(userSourcePreferences.userId, userId),
            eq(userSourcePreferences.sourceId, sourceId)
          )
        );
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting user source preference:', error);
      return false;
    }
  }

  // User Preferences
  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    try {
      const result = await this.db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return undefined;
    }
  }

  async createUserPreferences(insertPreferences: InsertUserPreferences): Promise<UserPreferences> {
    try {
      const result = await this.db.insert(userPreferences).values({
        userId: insertPreferences.userId,
        displayName: insertPreferences.displayName || null,
        watchlistKeywords: insertPreferences.watchlistKeywords || null,
        autoExtractIOCs: insertPreferences.autoExtractIOCs,
        autoEnrichIOCs: insertPreferences.autoEnrichIOCs,
        hiddenIOCTypes: insertPreferences.hiddenIOCTypes as string[],
        emailWeeklyDigest: insertPreferences.emailWeeklyDigest,
        emailWatchlistAlerts: insertPreferences.emailWatchlistAlerts,
      }).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating user preferences:', error);
      throw error;
    }
  }

  async updateUserPreferences(userId: number, updatePreferences: Partial<InsertUserPreferences>): Promise<UserPreferences | undefined> {
    try {
      // Check if preferences exist
      const existing = await this.getUserPreferences(userId);
      
      if (!existing) {
        // Create new if doesn't exist
        const defaults: InsertUserPreferences = {
          userId,
          autoExtractIOCs: true,
          autoEnrichIOCs: false,
          hiddenIOCTypes: [],
          emailWeeklyDigest: false,
          emailWatchlistAlerts: false,
          ...updatePreferences,
        };
        return this.createUserPreferences(defaults);
      }

      const result = await this.db.update(userPreferences)
        .set({
          ...updatePreferences,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, userId))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return undefined;
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
      const result = await this.db.insert(rssSources).values(insertRssSource).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating RSS source:', error);
      throw error;
    }
  }

  async updateRssSource(id: string, updateRssSource: Partial<InsertRssSource>): Promise<RssSource> {
    try {
      const result = await this.db.update(rssSources).set(updateRssSource).where(eq(rssSources.id, id)).returning();
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
  async getCVEs(params?: { limit?: number; offset?: number; severity?: string }): Promise<CVE[]> {
    try {
      let queryBuilder = this.db.select().from(vulnerabilities);
      
      const conditions = [];
      
      if (params?.severity) {
        conditions.push(eq(vulnerabilities.cvssV3Severity, params.severity));
      }

      if (conditions.length > 0) {
        queryBuilder = queryBuilder.where(and(...conditions)) as typeof queryBuilder;
      }

      // Apply sorting by published date (newest first)
      queryBuilder = queryBuilder.orderBy(desc(vulnerabilities.publishedDate)) as typeof queryBuilder;

      // Apply pagination
      const limit = params?.limit || 20;
      const offset = params?.offset || 0;
      queryBuilder = queryBuilder.limit(limit).offset(offset) as typeof queryBuilder;

      const results = await queryBuilder;
      return results.map(result => ({
        id: result.id,
        description: result.description,
        publishedDate: result.publishedDate,
        lastModifiedDate: result.lastModifiedDate,
        vulnStatus: result.vulnStatus,
        cvssV3Score: result.cvssV3Score ? parseFloat(result.cvssV3Score as any) : null,
        cvssV3Severity: result.cvssV3Severity,
        cvssV2Score: result.cvssV2Score ? parseFloat(result.cvssV2Score as any) : null,
        cvssV2Severity: result.cvssV2Severity,
        weaknesses: result.weaknesses || [],
        references: result.referenceUrls ? result.referenceUrls.map(url => ({
          url: url.url,
          source: url.source,
          tags: url.tags
        })) : [],
        createdAt: result.createdAt || new Date()
      }));
    } catch (error) {
      console.error('Error fetching CVEs:', error);
      return [];
    }
  }

  async getCVE(id: string): Promise<CVE | undefined> {
    try {
      const result = await this.db.select().from(vulnerabilities).where(eq(vulnerabilities.id, id)).limit(1);
      if (result.length === 0) return undefined;
      
      const vuln = result[0];
      return {
        id: vuln.id,
        description: vuln.description,
        publishedDate: vuln.publishedDate,
        lastModifiedDate: vuln.lastModifiedDate,
        vulnStatus: vuln.vulnStatus,
        cvssV3Score: vuln.cvssV3Score ? parseFloat(vuln.cvssV3Score as any) : null,
        cvssV3Severity: vuln.cvssV3Severity,
        cvssV2Score: vuln.cvssV2Score ? parseFloat(vuln.cvssV2Score as any) : null,
        cvssV2Severity: vuln.cvssV2Severity,
        weaknesses: vuln.weaknesses || [],
        references: vuln.referenceUrls ? vuln.referenceUrls.map(url => ({
          url: url.url,
          source: url.source,
          tags: url.tags
        })) : [],
        createdAt: vuln.createdAt || new Date()
      };
    } catch (error) {
      console.error('Error fetching CVE:', error);
      return undefined;
    }
  }

  async createCVE(insertCVE: InsertCVE): Promise<CVE> {
    try {
      // Convert references to referenceUrls format and handle decimal types
      const vulnerabilityData: any = {
        id: insertCVE.id,
        description: insertCVE.description,
        publishedDate: insertCVE.publishedDate,
        lastModifiedDate: insertCVE.lastModifiedDate,
        vulnStatus: insertCVE.vulnStatus,
        cvssV3Score: insertCVE.cvssV3Score !== undefined && insertCVE.cvssV3Score !== null ? String(insertCVE.cvssV3Score) : null,
        cvssV3Severity: insertCVE.cvssV3Severity,
        cvssV2Score: insertCVE.cvssV2Score !== undefined && insertCVE.cvssV2Score !== null ? String(insertCVE.cvssV2Score) : null,
        cvssV2Severity: insertCVE.cvssV2Severity,
        weaknesses: insertCVE.weaknesses || [],
        referenceUrls: insertCVE.references || [],
        createdAt: new Date()
      };
      
      const result = await this.db.insert(vulnerabilities).values(vulnerabilityData).returning();
      const vuln = result[0];
      
      return {
        id: vuln.id,
        description: vuln.description,
        publishedDate: vuln.publishedDate,
        lastModifiedDate: vuln.lastModifiedDate,
        vulnStatus: vuln.vulnStatus,
        cvssV3Score: vuln.cvssV3Score ? parseFloat(vuln.cvssV3Score as any) : null,
        cvssV3Severity: vuln.cvssV3Severity,
        cvssV2Score: vuln.cvssV2Score ? parseFloat(vuln.cvssV2Score as any) : null,
        cvssV2Severity: vuln.cvssV2Severity,
        weaknesses: vuln.weaknesses || [],
        references: vuln.referenceUrls ? vuln.referenceUrls.map(url => ({
          url: url.url,
          source: url.source,
          tags: url.tags
        })) : [],
        createdAt: vuln.createdAt || new Date()
      };
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

  // Users
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    try {
      const result = await this.db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching user by Google ID:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const result = await this.db.insert(users).values(insertUser).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUserLastLogin(googleId: string): Promise<User | undefined> {
    try {
      const result = await this.db.update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.googleId, googleId))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating user last login:', error);
      return undefined;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await this.db.select().from(users).orderBy(desc(users.lastLoginAt));
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  }

  // Email Authentication Methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return undefined;
    }
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    try {
      const { sql } = await import('drizzle-orm');
      const result = await this.db.select().from(users).where(
        and(
          eq(users.verificationToken, token),
          sql`${users.verificationTokenExpiry} > NOW()`
        )
      ).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching user by verification token:', error);
      return undefined;
    }
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    try {
      const { sql } = await import('drizzle-orm');
      const result = await this.db.select().from(users).where(
        and(
          eq(users.resetToken, token),
          sql`${users.resetTokenExpiry} > NOW()`
        )
      ).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching user by reset token:', error);
      return undefined;
    }
  }

  async createEmailUser(user: {
    name: string;
    email: string;
    passwordHash: string;
    verificationToken: string | null;
    verificationTokenExpiry: Date | null;
  }): Promise<User> {
    try {
      const result = await this.db.insert(users).values({
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        verificationToken: user.verificationToken,
        verificationTokenExpiry: user.verificationTokenExpiry,
        emailVerified: false,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      }).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating email user:', error);
      throw new Error('Failed to create user');
    }
  }

  async verifyUserEmail(userId: number): Promise<boolean> {
    try {
      const result = await this.db.update(users)
        .set({
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
        })
        .where(eq(users.id, userId));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error verifying user email:', error);
      return false;
    }
  }

  async updateUserPassword(userId: number, passwordHash: string): Promise<boolean> {
    try {
      const result = await this.db.update(users)
        .set({ passwordHash })
        .where(eq(users.id, userId));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error updating user password:', error);
      return false;
    }
  }

  async setResetToken(userId: number, resetToken: string, expiry: Date): Promise<boolean> {
    try {
      const result = await this.db.update(users)
        .set({
          resetToken,
          resetTokenExpiry: expiry,
        })
        .where(eq(users.id, userId));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error setting reset token:', error);
      return false;
    }
  }

  async clearResetToken(userId: number): Promise<boolean> {
    try {
      const result = await this.db.update(users)
        .set({
          resetToken: null,
          resetTokenExpiry: null,
        })
        .where(eq(users.id, userId));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error clearing reset token:', error);
      return false;
    }
  }
}