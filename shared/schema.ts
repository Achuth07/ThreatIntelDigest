import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, json, integer, decimal } from "drizzle-orm/pg-core";
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
  tags: json("tags").$type<string[]>().default([]),
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
  isActive: boolean("is_active").default(true),
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
  weaknesses: json("weaknesses").$type<string[]>().default([]), // CWE IDs
  configurations: json("configurations").$type<any[]>().default([]), // CPE configurations
  references: json("references").$type<{url: string; source: string; tags?: string[]}[]>().default([]),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  createdAt: true,
});

export const insertBookmarkSchema = createInsertSchema(bookmarks).omit({
  id: true,
  createdAt: true,
});

export const insertRssSourceSchema = createInsertSchema(rssSources).omit({
  id: true,
  lastFetched: true,
});

export const insertVulnerabilitySchema = createInsertSchema(vulnerabilities).omit({
  createdAt: true,
});

export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articles.$inferSelect;
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertRssSource = z.infer<typeof insertRssSourceSchema>;
export type RssSource = typeof rssSources.$inferSelect;
export type InsertVulnerability = z.infer<typeof insertVulnerabilitySchema>;
export type Vulnerability = typeof vulnerabilities.$inferSelect;
