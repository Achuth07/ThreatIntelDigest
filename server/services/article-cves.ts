import { sql, type SQL } from 'drizzle-orm';
import { getDb } from '../db.js';

// Links news articles to the CVE IDs they mention (WHA-54). See migrations/007_article_cves.sql.

export type FoundIn = 'title' | 'summary' | 'content';

export interface LinkableArticle {
  id: string | null;
  url: string;
  title: string;
  source: string;
  publishedAt: Date | string;
}

export interface RelatedNewsItem {
  id: string | null;
  title: string;
  summary: string | null;
  url: string;
  source: string;
  publishedAt: string;
  threatLevel: string | null;
  matchType: 'mentioned' | 'related';
}

interface Executor {
  execute(query: SQL): Promise<{ rows: any[] }>;
}

// Bulletins can list hundreds of CVEs; anything past this is noise for a single page.
export const MAX_CVES_PER_ARTICLE = 500;

// Feeds sometimes use typographic hyphens (U+2010, U+2011, U+2013) inside CVE IDs.
const CVE_PATTERN = /CVE[-‐‑–](\d{4})[-‐‑–](\d{4,7})(?!\d)/gi;

// Returns each CVE ID once, with the first place it appears: title, then summary, then content.
export function extractCveMentions(parts: { title?: string | null; summary?: string | null; content?: string | null }): Map<string, FoundIn> {
  const found = new Map<string, FoundIn>();
  const fields: [FoundIn, string | null | undefined][] = [['title', parts.title], ['summary', parts.summary], ['content', parts.content]];
  for (const [where, text] of fields) {
    if (!text) continue;
    for (const match of text.matchAll(CVE_PATTERN)) {
      const year = Number(match[1]);
      if (year < 1999 || year > new Date().getUTCFullYear() + 1) continue;
      const id = `CVE-${match[1]}-${match[2]}`;
      if (!found.has(id)) found.set(id, where);
      if (found.size >= MAX_CVES_PER_ARTICLE) return found;
    }
  }
  return found;
}

// Upserts links for one article. Safe to repeat; a re-run fills in article_id if it was missing.
// Returns how many links were new; rows that already existed are updated but not counted.
export async function linkArticleCves(db: Executor, article: LinkableArticle, mentions: Map<string, FoundIn>): Promise<number> {
  if (mentions.size === 0) return 0;
  // Pass a Date, as the articles INSERT does, so both columns get the same wall-clock value.
  const publishedAt = new Date(article.publishedAt);
  const values = sql.join(
    Array.from(mentions, ([cveId, foundIn]) =>
      sql`(${cveId}, ${article.url}, ${article.id}::uuid, ${article.title}, ${article.source}, ${publishedAt}::timestamp, ${foundIn})`),
    sql`, `,
  );
  const result = await db.execute(sql`
    INSERT INTO article_cves (cve_id, article_url, article_id, title, source, published_at, found_in)
    VALUES ${values}
    ON CONFLICT (cve_id, article_url) DO UPDATE
      SET article_id = COALESCE(EXCLUDED.article_id, article_cves.article_id)
    RETURNING (xmax = 0) AS inserted
  `);
  // xmax is 0 only on a row this statement inserted, not on one ON CONFLICT updated.
  return result.rows.filter(row => row.inserted === true).length;
}

export async function getArticleCveIds(db: Executor, articleId: string): Promise<string[]> {
  const { rows } = await db.execute(sql`
    SELECT cve_id FROM article_cves WHERE article_id = ${articleId}::uuid
    ORDER BY CASE found_in WHEN 'title' THEN 0 WHEN 'summary' THEN 1 ELSE 2 END, cve_id
  `);
  return rows.map(row => row.cve_id);
}

// Articles that name this CVE, newest first. Links whose article has been cleaned up keep their copy.
// On a database error it logs and returns [], so callers still show keyword matches.
export async function getArticlesMentioningCve(cveId: string, limit: number, db?: Executor): Promise<RelatedNewsItem[]> {
  try {
    return await queryArticlesMentioningCve(cveId, limit, db ?? getDb());
  } catch (error) {
    console.error(`[article-cves] lookup failed for ${cveId}:`, error);
    return [];
  }
}

async function queryArticlesMentioningCve(cveId: string, limit: number, db: Executor): Promise<RelatedNewsItem[]> {
  const { rows } = await db.execute(sql`
    SELECT l.article_id, l.title, l.article_url, l.source, l.published_at, a.summary, a.threat_level
    FROM article_cves l
    LEFT JOIN articles a ON a.id = l.article_id
    WHERE l.cve_id = ${cveId.toUpperCase()}
    ORDER BY l.published_at DESC
    LIMIT ${limit}
  `);
  return rows.map(row => ({
    id: row.article_id ?? null,
    title: row.title,
    summary: row.summary ?? null,
    url: row.article_url,
    source: row.source,
    publishedAt: new Date(row.published_at).toISOString(),
    threatLevel: row.threat_level ?? null,
    matchType: 'mentioned' as const,
  }));
}

// Exact mentions first, then the older keyword matches to fill the list, without repeating a URL.
export function mergeRelatedNews(mentioned: RelatedNewsItem[], related: any[], limit: number): RelatedNewsItem[] {
  const seen = new Set(mentioned.map(item => item.url));
  const merged = [...mentioned];
  for (const article of related) {
    if (merged.length >= limit) break;
    if (!article?.url || seen.has(article.url)) continue;
    seen.add(article.url);
    merged.push({
      id: article.id ?? null,
      title: article.title,
      summary: article.summary ?? null,
      url: article.url,
      source: article.source,
      publishedAt: new Date(article.publishedAt).toISOString(),
      threatLevel: article.threatLevel ?? null,
      matchType: 'related',
    });
  }
  return merged.slice(0, limit);
}
