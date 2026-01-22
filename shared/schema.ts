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
  jsonb,
  uuid,
  unique
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const articles = pgTable("articles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  summary: text("summary"),
  url: text("url").notNull(),
  source: text("source").notNull(),
  sourceIcon: text("source_icon"),
  publishedAt: timestamp("published_at").notNull(),
  threatLevel: text("threat_level").notNull().default("MEDIUM"),
  tags: jsonb("tags").$type<string[]>().default([]),
  targetedIndustries: jsonb("targeted_industries").$type<string[]>().default([]),
  readTime: integer("read_time").default(5),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const bookmarks = pgTable("bookmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: uuid("article_id").notNull().references(() => articles.id),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const rssSources = pgTable("rss_sources", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
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
  cvssVector: text("cvss_vector"), // e.g. CVSS:3.1/AV:N/AC:L...
  exploitabilityScore: decimal("exploitability_score", { precision: 3, scale: 1 }),
  impactScore: decimal("impact_score", { precision: 3, scale: 1 }),
  weaknesses: jsonb("weaknesses").$type<string[]>().default([]), // CWE IDs

  vendors: jsonb("vendors").$type<string[]>().default([]), // Extracted vendors
  affectedProducts: jsonb("affected_products").$type<{ vendor: string; product: string; versions?: string[] }[]>().default([]),
  referenceUrls: jsonb("reference_urls").$type<{ url: string; source: string; tags?: string[] }[]>().default([]),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const knownExploitedVulnerabilities = pgTable("known_exploited_vulnerabilities", {
  cveID: varchar("cve_id").primaryKey(),
  vendorProject: text("vendor_project").notNull(),
  product: text("product").notNull(),
  vulnerabilityName: text("vulnerability_name").notNull(),
  dateAdded: timestamp("date_added").notNull(),
  shortDescription: text("short_description").notNull(),
  requiredAction: text("required_action").notNull(),
  dueDate: timestamp("due_date"),
  knownRansomwareCampaignUse: text("known_ransomware_campaign_use"), // "Known" or "Unknown"
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  googleId: varchar('google_id', { length: 255 }).unique(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  avatar: text('avatar'),
  passwordHash: text('password_hash'),
  emailVerified: pgBoolean('email_verified').default(false),
  verificationToken: text('verification_token'),
  verificationTokenExpiry: timestamp('verification_token_expiry'),
  resetToken: text('reset_token'),
  resetTokenExpiry: timestamp('reset_token_expiry'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at').defaultNow().notNull(),
  role: text('role'),
  topics: jsonb('topics').$type<string[]>().default([]),
  hasOnboarded: pgBoolean('has_onboarded').default(false),
});

export const userSourcePreferences = pgTable('user_source_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sourceId: varchar('source_id').notNull().references(() => rssSources.id, { onDelete: 'cascade' }),
  isActive: pgBoolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  displayName: text('display_name'),
  watchlistKeywords: text('watchlist_keywords'),
  autoExtractIOCs: pgBoolean('auto_extract_iocs').default(true),
  autoEnrichIOCs: pgBoolean('auto_enrich_iocs').default(false),
  hiddenIOCTypes: jsonb('hidden_ioc_types').$type<string[]>().default([]),
  emailWeeklyDigest: pgBoolean('email_weekly_digest').default(false),
  emailWatchlistAlerts: pgBoolean('email_watchlist_alerts').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
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

export const insertBookmarkSchema = createInsertSchema(bookmarks, {
  userId: z.number().int().positive(),
}).omit({
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
  cvssVector: z.string().optional(),
  exploitabilityScore: z.number().optional(),
  impactScore: z.number().optional(),
  weaknesses: z.array(z.string()).default([]),
  referenceUrls: z.array(z.object({
    url: z.string().url(),
    source: z.string(),
    tags: z.array(z.string()).optional()
  })).default([]),
  vendors: z.array(z.string()).default([]),
  affectedProducts: z.array(z.object({
    vendor: z.string(),
    product: z.string(),
    versions: z.array(z.string()).optional()
  })).default([]),
}).omit({
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users, {
  googleId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.string().optional(),
  topics: z.array(z.string()).optional(),
  hasOnboarded: z.boolean().optional(),
}).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
});

export const insertUserSourcePreferenceSchema = createInsertSchema(userSourcePreferences, {
  userId: z.number().int().positive(),
  sourceId: z.string().min(1),
  isActive: z.boolean().default(true),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences, {
  userId: z.number().int().positive(),
  displayName: z.string().regex(/^[a-zA-Z0-9\s]+$/, "Display name must contain only letters, numbers, and spaces").min(1).max(50).optional(),
  watchlistKeywords: z.string().optional(),
  autoExtractIOCs: z.boolean().default(true),
  autoEnrichIOCs: z.boolean().default(false),
  hiddenIOCTypes: z.array(z.string()).default([]),
  emailWeeklyDigest: z.boolean().default(false),
  emailWatchlistAlerts: z.boolean().default(false),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articles.$inferSelect;
export type ArticleWithSource = Article & { sourceUrl?: string | null; isBookmarked?: boolean };
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertRssSource = z.infer<typeof insertRssSourceSchema>;
export type RssSource = typeof rssSources.$inferSelect;
export type InsertVulnerability = z.infer<typeof insertVulnerabilitySchema>;
export type Vulnerability = typeof vulnerabilities.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertUserSourcePreference = z.infer<typeof insertUserSourcePreferenceSchema>;
export type UserSourcePreference = typeof userSourcePreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;

export const insertKnownExploitedVulnerabilitySchema = createInsertSchema(knownExploitedVulnerabilities, {
  cveID: z.string().regex(/^CVE-\d{4}-\d{4,}$/),
  vendorProject: z.string().min(1),
  product: z.string().min(1),
  vulnerabilityName: z.string().min(1),
  dateAdded: z.date(),
  shortDescription: z.string().min(1),
  requiredAction: z.string().min(1),
  dueDate: z.date().optional(),
}).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertKnownExploitedVulnerability = z.infer<typeof insertKnownExploitedVulnerabilitySchema>;
export type KnownExploitedVulnerability = typeof knownExploitedVulnerabilities.$inferSelect;

export const threatGroups = pgTable("threat_groups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  stixId: text("stix_id").notNull().unique(), // The STIX ID
  name: text("name").notNull(),
  description: text("description"),
  aliases: jsonb("aliases").$type<string[]>().default([]),
  lastUpdated: timestamp("last_updated"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const articleThreatGroups = pgTable("article_threat_groups", {
  id: serial("id").primaryKey(),
  articleId: uuid("article_id").notNull().references(() => articles.id, { onDelete: 'cascade' }),
  threatGroupId: uuid("threat_group_id").notNull().references(() => threatGroups.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertThreatGroupSchema = createInsertSchema(threatGroups, {
  stixId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  aliases: z.array(z.string()).default([]),
  lastUpdated: z.date().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertArticleThreatGroupSchema = createInsertSchema(articleThreatGroups, {
  articleId: z.string().min(1),
  threatGroupId: z.string().min(1),
}).omit({
  id: true,
  createdAt: true,
});

export type ThreatGroup = typeof threatGroups.$inferSelect;
export type InsertArticleThreatGroup = z.infer<typeof insertArticleThreatGroupSchema>;
export type ArticleThreatGroup = typeof articleThreatGroups.$inferSelect;

export const cweCategories = pgTable("cwe_categories", {
  id: varchar("id").primaryKey(), // e.g., "CWE-79"
  name: text("name").notNull(),
  category: text("category").notNull(), // e.g., "Software Flaw"
  description: text("description"),
  lastUpdated: timestamp("last_updated").default(sql`now()`),
});

export const malwareDailyStats = pgTable("malware_daily_stats", {
  id: serial("id").primaryKey(),
  date: timestamp("date").default(sql`CURRENT_DATE`),
  familyName: varchar("family_name", { length: 100 }),
  sampleCount: integer("sample_count"),
  malwareType: varchar("malware_type", { length: 50 }),
  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => {
  return {
    dateFamilyUnique: unique('date_family_unique').on(table.date, table.familyName),
  };
});

export const insertMalwareDailyStatsSchema = createInsertSchema(malwareDailyStats, {
  date: z.date().optional(),
  familyName: z.string().min(1).max(100),
  sampleCount: z.number().int().nonnegative(),
  malwareType: z.string().max(50).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type MalwareDailyStat = typeof malwareDailyStats.$inferSelect;
export type InsertMalwareDailyStat = z.infer<typeof insertMalwareDailyStatsSchema>;