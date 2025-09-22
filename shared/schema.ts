import { sql } from "drizzle-orm";
import { 
  pgTable, 
  serial, 
  text, 
  timestamp, 
  varchar, 
  integer, 
  boolean as pgBoolean, 
  decimal,
  jsonb
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const articles = pgTable("articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  summary: text("summary"),
  url: text("url").notNull(),
  source: text("source").notNull(),
  sourceIcon: text("source_icon"),
  publishedAt: timestamp("published_at").notNull(),
  threatLevel: text("threat_level").notNull().default("MEDIUM"),
  tags: jsonb("tags").$type<string[]>().default([]),
  readTime: integer("read_time").default(5),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const bookmarks = pgTable("bookmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: varchar("article_id").notNull().references(() => articles.id),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const rssSources = pgTable("rss_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  url: text("url").notNull(),
  icon: text("icon"),
  color: text("color").default("#6366f1"),
  isActive: pgBoolean("is_active").default(true),
  lastFetched: timestamp("last_fetched"),
});

export const vulnerabilities = pgTable("vulnerabilities", {
  id: varchar("id").primaryKey(), // CVE ID like CVE-2024-1234
  description: text("description").notNull(),
  publishedDate: timestamp("published_date").notNull(),
  lastModifiedDate: timestamp("last_modified_date").notNull(),
  vulnStatus: text("vuln_status").notNull(), // Analyzed, Modified, etc.
  cvssV3Score: decimal("cvss_v3_score", { precision: 3, scale: 1 }),
  cvssV3Severity: text("cvss_v3_severity"), // CRITICAL, HIGH, MEDIUM, LOW
  cvssV2Score: decimal("cvss_v2_score", { precision: 3, scale: 1 }),
  cvssV2Severity: text("cvss_v2_severity"),
  weaknesses: jsonb("weaknesses").$type<string[]>().default([]), // CWE IDs
  configurations: jsonb("configurations").$type<any[]>().default([]), // CPE configurations
  referenceUrls: jsonb("reference_urls").$type<{url: string; source: string; tags?: string[]}[]>().default([]),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  googleId: varchar('google_id', { length: 255 }).unique().notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at').defaultNow().notNull(),
});

export const insertArticleSchema = createInsertSchema(articles, {
  title: z.string().min(1),
  url: z.string().url(),
  source: z.string().min(1),
  publishedAt: z.date(),
  threatLevel: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  tags: z.array(z.string()).default([]),
  readTime: z.number().int().positive().default(5),
}).omit({
  id: true,
  createdAt: true,
});

export const insertBookmarkSchema = createInsertSchema(bookmarks).omit({
  id: true,
  createdAt: true,
});

export const insertRssSourceSchema = createInsertSchema(rssSources, {
  name: z.string().min(1),
  url: z.string().url(),
}).omit({
  id: true,
  lastFetched: true,
});

export const insertVulnerabilitySchema = createInsertSchema(vulnerabilities, {
  id: z.string().regex(/^CVE-\d{4}-\d{4,}$/),
  description: z.string().min(1),
  publishedDate: z.date(),
  lastModifiedDate: z.date(),
  vulnStatus: z.string().min(1),
  cvssV3Score: z.number().min(0).max(10).nullable().optional(),
  cvssV3Severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).nullable().optional(),
  cvssV2Score: z.number().min(0).max(10).nullable().optional(),
  cvssV2Severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).nullable().optional(),
  weaknesses: z.array(z.string()).default([]),
  referenceUrls: z.array(z.object({
    url: z.string().url(),
    source: z.string(),
    tags: z.array(z.string()).optional()
  })).default([]),
}).omit({
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users, {
  googleId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
}).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
});

export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articles.$inferSelect;
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertRssSource = z.infer<typeof insertRssSourceSchema>;
export type RssSource = typeof rssSources.$inferSelect;
export type InsertVulnerability = z.infer<typeof insertVulnerabilitySchema>;
export type Vulnerability = typeof vulnerabilities.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;