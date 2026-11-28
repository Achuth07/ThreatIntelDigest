import { createRoute, z, type OpenAPIHono } from '@hono/zod-openapi';
import { sql, type SQL } from 'drizzle-orm';
import { getDb } from '../../db.js';
import { requireScope } from '../lib/scopes.js';
import {
  ErrorSchema, PageQuery, authErrors, csvValues, errorBody, isoDate, jsonContent, likeContains, listEnvelope, listSchema,
  offsetOf, pageTooDeep, toIso, validationDetails, MAX_OFFSET,
} from '../lib/responses.js';
import { CURATED_NAMES, curatedSource } from '../lib/sources.js';
import { NewsItemSchema, SourceSchema, THREAT_LEVELS, serializeNewsItem } from '../serializers/news.js';
import type { ApiEnv } from '../app.js';

// GET /v1/news, /v1/news/{id} and /v1/sources (WHA-63). Scope: news:read.
// Articles are kept for 30 days, so older ids return 404. Only the curated sources appear.

const SCOPE = 'news:read';
const CVE_ID = /^CVE-\d{4}-\d{4,}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ListQuery = PageQuery.extend({
  search: z.string().trim().min(2).max(200).optional().openapi({ description: 'Every word must appear in the title or summary.' }),
  source: z.string().trim().min(1).max(255).optional().openapi({ description: 'A source name from /sources.' }),
  threat_level: z.string().optional().openapi({ description: 'One or more of critical, high, medium, low, comma-separated.' }),
  tag: z.string().trim().min(1).max(100).optional(),
  industry: z.string().trim().min(1).max(100).optional().openapi({ description: 'A targeted industry, e.g. healthcare.' }),
  cve: z.string().trim().regex(CVE_ID, 'Use a CVE id such as CVE-2024-3400').optional().openapi({ description: 'Articles that mention this CVE.' }),
  threat_actor: z.string().trim().min(1).max(100).optional().openapi({ description: 'An ATT&CK group id (G0016) or WhatCyber slug (apt29).' }),
  published_after: isoDate.optional(),
  published_before: isoDate.optional(),
  sort: z.enum(['published', '-published']).default('-published'),
});
const LIST_PARAMS = Object.keys(ListQuery.shape);

const SourcesQuery = PageQuery;

const listRoute = createRoute({
  method: 'get', path: '/news', tags: ['News'], summary: 'List security news',
  middleware: [requireScope(SCOPE)] as const,
  request: { query: ListQuery },
  responses: { 200: jsonContent(listSchema(NewsItemSchema, 'NewsList'), 'A page of articles'), 400: jsonContent(ErrorSchema, 'Invalid parameters'), ...authErrors(SCOPE) },
});
const detailRoute = createRoute({
  method: 'get', path: '/news/{id}', tags: ['News'], summary: 'Get one article',
  middleware: [requireScope(SCOPE)] as const,
  request: { params: z.object({ id: z.string().openapi({ example: '3f2b8c1e-8a5d-4f7e-9c41-2d6a0b9e7f13' }) }) },
  responses: { 200: jsonContent(NewsItemSchema, 'The article'), 400: jsonContent(ErrorSchema, 'Invalid id'), 404: jsonContent(ErrorSchema, 'Unknown or expired article'), ...authErrors(SCOPE) },
});
const sourcesRoute = createRoute({
  method: 'get', path: '/sources', tags: ['News'], summary: 'List news sources',
  middleware: [requireScope(SCOPE)] as const,
  request: { query: SourcesQuery },
  responses: { 200: jsonContent(listSchema(SourceSchema, 'SourceList'), 'Active sources'), 400: jsonContent(ErrorSchema, 'Invalid parameters'), ...authErrors(SCOPE) },
});

const CURATED = sql`a.source IN (${sql.join(CURATED_NAMES.map(name => sql`${name}`), sql`, `)})`;

// Articles with the CVEs and actors linked to them.
const COLUMNS = sql`
  a.id, a.title, a.summary, a.url, a.source, a.published_at, a.threat_level, a.tags, a.targeted_industries,
  COALESCE((SELECT array_agg(DISTINCT c.cve_id ORDER BY c.cve_id) FROM article_cves c WHERE c.article_id = a.id), '{}') AS cves,
  COALESCE((SELECT json_agg(json_build_object('name', t.name, 'attack_id', t.attack_id, 'slug', t.slug) ORDER BY t.name)
            FROM article_threat_groups g JOIN threat_groups t ON t.id = g.threat_group_id WHERE g.article_id = a.id), '[]') AS actors`;

export const NEWS_COLUMNS = COLUMNS;
export const CURATED_ARTICLES = CURATED;

function filters(q: z.infer<typeof ListQuery>): { where: SQL[] } | { error: string; field: string } {
  const where: SQL[] = [CURATED];
  if (q.search) {
    const words = q.search.split(/\s+/).filter(Boolean).slice(0, 8);
    for (const word of words) where.push(sql`(a.title || ' ' || COALESCE(a.summary, '')) ILIKE ${likeContains(word)}`);
  }
  if (q.source) where.push(sql`lower(a.source) = ${q.source.toLowerCase()}`);
  if (q.threat_level) {
    const parsed = csvValues(q.threat_level, THREAT_LEVELS);
    if ('bad' in parsed) return { error: `Unknown threat_level "${parsed.bad}". Use ${THREAT_LEVELS.join(', ')}.`, field: 'threat_level' };
    where.push(sql`upper(a.threat_level) IN (${sql.join(parsed.values.map(v => sql`${v.toUpperCase()}`), sql`, `)})`);
  }
  if (q.tag) where.push(sql`EXISTS (SELECT 1 FROM unnest(a.tags) t WHERE lower(t) = ${q.tag.toLowerCase()})`);
  if (q.industry) where.push(sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(a.targeted_industries) i WHERE lower(i) = ${q.industry.toLowerCase()})`);
  if (q.cve) where.push(sql`EXISTS (SELECT 1 FROM article_cves c WHERE c.article_id = a.id AND c.cve_id = ${q.cve.toUpperCase()})`);
  if (q.threat_actor) {
    const actor = q.threat_actor;
    where.push(sql`EXISTS (SELECT 1 FROM article_threat_groups g JOIN threat_groups t ON t.id = g.threat_group_id
      WHERE g.article_id = a.id AND (t.attack_id = ${actor.toUpperCase()} OR t.slug = ${actor.toLowerCase()}))`);
  }
  if (q.published_after) where.push(sql`a.published_at >= ${new Date(q.published_after).toISOString()}::timestamptz AT TIME ZONE 'UTC'`);
  if (q.published_before) where.push(sql`a.published_at < ${new Date(q.published_before).toISOString()}::timestamptz AT TIME ZONE 'UTC'`);
  return { where };
}

const badRequest = (c: any, message: string, field: string) =>
  c.json(errorBody(c, 'validation_error', message, { fields: [{ field, message }] }), 400);
const invalidQuery = (result: any, c: any) => {
  if (!result.success) return c.json(errorBody(c, 'validation_error', 'Some parameters are not valid.', validationDetails(result.error.issues)), 400) as any;
};

export function registerNewsRoutes(v1: OpenAPIHono<ApiEnv>) {
  v1.openapi(listRoute, async c => {
    const q = c.req.valid('query');
    const page = { page: q.page, page_size: q.page_size };
    if (pageTooDeep(page)) return badRequest(c, `Pages can reach the first ${MAX_OFFSET.toLocaleString('en')} results.`, 'page') as any;
    const built = filters(q);
    if ('error' in built) return badRequest(c, built.error, built.field) as any;
    const whereSql = sql`WHERE ${sql.join(built.where, sql` AND `)}`;
    const dir = q.sort === 'published' ? sql`ASC` : sql`DESC`;
    const db = getDb();
    const [{ rows }, { rows: counted }] = await Promise.all([
      db.execute(sql`SELECT ${COLUMNS} FROM articles a ${whereSql} ORDER BY a.published_at ${dir}, a.id ${dir} LIMIT ${q.page_size} OFFSET ${offsetOf(page)}`),
      db.execute(sql`SELECT count(*)::int AS n FROM articles a ${whereSql}`),
    ]);
    c.header('Cache-Control', 'private, max-age=120');
    return c.json(listEnvelope(c, page, LIST_PARAMS, Number(counted[0].n), rows.map(serializeNewsItem)), 200);
  }, invalidQuery);

  v1.openapi(detailRoute, async c => {
    const id = c.req.valid('param').id;
    if (!UUID.test(id)) return badRequest(c, 'Use an article id from /news.', 'id') as any;
    const { rows } = await getDb().execute(sql`SELECT ${COLUMNS} FROM articles a WHERE a.id = ${id.toLowerCase()}::uuid AND ${CURATED}`);
    if (!rows[0]) return c.json(errorBody(c, 'not_found', 'No article with that id. Articles are kept for 30 days.'), 404) as any;
    c.header('Cache-Control', 'private, max-age=300');
    return c.json(serializeNewsItem(rows[0]), 200);
  }, invalidQuery);

  v1.openapi(sourcesRoute, async c => {
    const q = c.req.valid('query');
    const { rows } = await getDb().execute(sql`
      SELECT r.name, r.url, r.last_fetched, (SELECT count(*)::int FROM articles a WHERE a.source = r.name) AS article_count
      FROM rss_sources r WHERE r.is_active IS TRUE ORDER BY lower(r.name)
    `);
    // Matched in code against the curated list (by name, or feed URL if the name was changed).
    const sources = rows.flatMap((row: any) => {
      const curated = curatedSource(row.name, row.url);
      if (!curated) return [];
      let site = row.url;
      try { site = new URL(row.url).origin; } catch { /* keep the feed URL */ }
      return [{ name: row.name, category: curated.category, feed_url: row.url, site_url: site, article_count: Number(row.article_count), last_fetched_at: toIso(row.last_fetched) }];
    });
    const offset = offsetOf(q);
    c.header('Cache-Control', 'private, max-age=3600');
    return c.json(listEnvelope(c, q, Object.keys(SourcesQuery.shape), sources.length, sources.slice(offset, offset + q.page_size)), 200);
  }, invalidQuery);
}
