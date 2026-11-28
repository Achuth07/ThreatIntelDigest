import { createRoute, z, type OpenAPIHono } from '@hono/zod-openapi';
import { sql, type SQL } from 'drizzle-orm';
import { getDb } from '../../db.js';
import { requireScope } from '../lib/scopes.js';
import {
  ErrorSchema, PageQuery, authErrors, errorBody, isoDate, jsonContent, likeContains, listEnvelope, listSchema, offsetOf,
  pageTooDeep, validationDetails, MAX_OFFSET,
} from '../lib/responses.js';
import { SCORE_COLUMNS } from '../lib/cve-sql.js';
import {
  ActorCveSchema, ActorDetailSchema, ActorItemSchema, ActorTechniqueSchema, serializeActorCve, serializeActorDetail,
  serializeActorItem, serializeActorTechnique,
} from '../serializers/actor.js';
import { NewsItemSchema, serializeNewsItem } from '../serializers/news.js';
import { CURATED_ARTICLES, NEWS_COLUMNS } from './news.js';
import type { ApiEnv } from '../app.js';

// GET /v1/threat-actors and its sub-resources (WHA-62). Scope: actors:read.
// {id} is an ATT&CK group id (G0016) or a slug (apt29). Groups ATT&CK has revoked are left out.

const SCOPE = 'actors:read';
const SORTS = ['name', '-name', '-last_updated', '-latest_article'] as const;

const ListQuery = PageQuery.extend({
  search: z.string().trim().min(2).max(100).optional().openapi({ description: 'Part of the name or an alias, e.g. Cozy Bear.' }),
  technique: z.string().trim().regex(/^T\d{4}(\.\d{3})?$/i, 'Use an ATT&CK technique id such as T1566 or T1566.001').optional()
    .openapi({ description: 'Groups that use the technique. A technique id also matches its sub-techniques.' }),
  software: z.string().trim().min(2).max(100).optional().openapi({ description: 'An ATT&CK software id (S0154) or name (Cobalt Strike).' }),
  active_since: isoDate.optional().openapi({ description: 'Groups named in news on or after this date.' }),
  sort: z.enum(SORTS).default('name'),
});
const LIST_PARAMS = Object.keys(ListQuery.shape);
const SubQuery = PageQuery;
const SUB_PARAMS = Object.keys(SubQuery.shape);

const idParam = z.object({ id: z.string().openapi({ example: 'G0016' }) });
const notFound = jsonContent(ErrorSchema, 'Unknown threat actor');

const listRoute = createRoute({
  method: 'get', path: '/threat-actors', tags: ['Threat actors'], summary: 'List threat actors',
  middleware: [requireScope(SCOPE)] as const, request: { query: ListQuery },
  responses: { 200: jsonContent(listSchema(ActorItemSchema, 'ThreatActorList'), 'A page of threat actors'), 400: jsonContent(ErrorSchema, 'Invalid parameters'), ...authErrors(SCOPE) },
});
const detailRoute = createRoute({
  method: 'get', path: '/threat-actors/{id}', tags: ['Threat actors'], summary: 'Get one threat actor',
  middleware: [requireScope(SCOPE)] as const, request: { params: idParam },
  responses: { 200: jsonContent(ActorDetailSchema, 'The threat actor'), 404: notFound, ...authErrors(SCOPE) },
});
const articlesRoute = createRoute({
  method: 'get', path: '/threat-actors/{id}/articles', tags: ['Threat actors'], summary: 'News naming a threat actor',
  middleware: [requireScope(SCOPE)] as const, request: { params: idParam, query: SubQuery },
  responses: { 200: jsonContent(listSchema(NewsItemSchema, 'ThreatActorArticleList'), 'Articles, newest first'), 400: jsonContent(ErrorSchema, 'Invalid parameters'), 404: notFound, ...authErrors(SCOPE) },
});
const techniquesRoute = createRoute({
  method: 'get', path: '/threat-actors/{id}/techniques', tags: ['Threat actors'], summary: 'ATT&CK techniques a threat actor uses',
  middleware: [requireScope(SCOPE)] as const, request: { params: idParam, query: SubQuery },
  responses: { 200: jsonContent(listSchema(ActorTechniqueSchema, 'ActorTechniqueList'), 'Techniques by id'), 400: jsonContent(ErrorSchema, 'Invalid parameters'), 404: notFound, ...authErrors(SCOPE) },
});
const cvesRoute = createRoute({
  method: 'get', path: '/threat-actors/{id}/cves', tags: ['Threat actors'], summary: 'CVEs linked to a threat actor',
  middleware: [requireScope(SCOPE)] as const, request: { params: idParam, query: SubQuery },
  responses: { 200: jsonContent(listSchema(ActorCveSchema, 'ActorCveList'), 'CVEs, high confidence first'), 400: jsonContent(ErrorSchema, 'Invalid parameters'), 404: notFound, ...authErrors(SCOPE) },
});

const ACTIVE = sql`t.attack_status <> 'revoked' AND t.attack_id IS NOT NULL`;

const COLUMNS = sql`
  t.id, t.attack_id, t.slug, t.name, t.aliases, t.description, t.last_updated,
  (SELECT count(*)::int FROM actor_techniques x JOIN attack_techniques at ON at.stix_id = x.technique_stix_id WHERE x.threat_group_id = t.id AND at.status = 'active') AS technique_count,
  (SELECT count(*)::int FROM actor_software x WHERE x.threat_group_id = t.id) AS software_count,
  (SELECT count(DISTINCT x.cve_id)::int FROM actor_cves x WHERE x.threat_group_id = t.id) AS cve_count,
  (SELECT count(*)::int FROM article_threat_groups g JOIN articles a ON a.id = g.article_id WHERE g.threat_group_id = t.id AND ${CURATED_ARTICLES}) AS article_count,
  (SELECT max(a.published_at) FROM article_threat_groups g JOIN articles a ON a.id = g.article_id WHERE g.threat_group_id = t.id AND ${CURATED_ARTICLES}) AS latest_article_at`;

function filters(q: z.infer<typeof ListQuery>): SQL[] {
  const where: SQL[] = [ACTIVE];
  if (q.search) {
    const pattern = likeContains(q.search);
    where.push(sql`(t.name ILIKE ${pattern} OR t.attack_id = ${q.search.toUpperCase()}
      OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(t.aliases) al WHERE al ILIKE ${pattern}))`);
  }
  if (q.technique) {
    const id = q.technique.toUpperCase();
    where.push(sql`EXISTS (SELECT 1 FROM actor_techniques x JOIN attack_techniques at ON at.stix_id = x.technique_stix_id
      WHERE x.threat_group_id = t.id AND at.status = 'active' AND (at.attack_id = ${id} OR at.parent_attack_id = ${id}))`);
  }
  if (q.software) {
    const value = q.software.toLowerCase();
    where.push(sql`EXISTS (SELECT 1 FROM actor_software x JOIN attack_software sw ON sw.stix_id = x.software_stix_id
      WHERE x.threat_group_id = t.id AND (lower(sw.attack_id) = ${value} OR lower(sw.name) = ${value}
        OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(sw.aliases) al WHERE lower(al) = ${value})))`);
  }
  if (q.active_since) {
    where.push(sql`EXISTS (SELECT 1 FROM article_threat_groups g JOIN articles a ON a.id = g.article_id
      WHERE g.threat_group_id = t.id AND ${CURATED_ARTICLES} AND a.published_at >= ${new Date(q.active_since).toISOString()}::timestamptz AT TIME ZONE 'UTC')`);
  }
  return where;
}

function orderBy(sort: (typeof SORTS)[number]): SQL {
  switch (sort) {
    case '-name': return sql`lower(name) DESC`;
    case '-last_updated': return sql`last_updated DESC NULLS LAST, lower(name)`;
    case '-latest_article': return sql`latest_article_at DESC NULLS LAST, lower(name)`;
    default: return sql`lower(name)`;
  }
}

// Finds a group by ATT&CK id or slug. Returns its internal id, or null.
async function resolveActor(db: any, value: string): Promise<any | null> {
  const isAttackId = /^G\d{4}$/i.test(value);
  const { rows } = await db.execute(sql`
    SELECT ${COLUMNS} FROM threat_groups t
    WHERE ${ACTIVE} AND ${isAttackId ? sql`t.attack_id = ${value.toUpperCase()}` : sql`t.slug = ${value.toLowerCase()}`}
  `);
  return rows[0] ?? null;
}

const badRequest = (c: any, message: string, field: string) =>
  c.json(errorBody(c, 'validation_error', message, { fields: [{ field, message }] }), 400);
const invalidQuery = (result: any, c: any) => {
  if (!result.success) return c.json(errorBody(c, 'validation_error', 'Some parameters are not valid.', validationDetails(result.error.issues)), 400) as any;
};
const unknownActor = (c: any, id: string) => c.json(errorBody(c, 'not_found', `No threat actor "${id}". Use an ATT&CK group id such as G0016 or a slug such as apt29.`), 404);
const tooDeep = (c: any) => badRequest(c, `Pages can reach the first ${MAX_OFFSET.toLocaleString('en')} results.`, 'page');

export function registerThreatActorRoutes(v1: OpenAPIHono<ApiEnv>) {
  v1.openapi(listRoute, async c => {
    const q = c.req.valid('query');
    const page = { page: q.page, page_size: q.page_size };
    if (pageTooDeep(page)) return tooDeep(c) as any;
    const where = sql`WHERE ${sql.join(filters(q), sql` AND `)}`;
    const db = getDb();
    const [{ rows }, { rows: counted }] = await Promise.all([
      db.execute(sql`SELECT * FROM (SELECT ${COLUMNS} FROM threat_groups t ${where}) actors ORDER BY ${orderBy(q.sort)} LIMIT ${q.page_size} OFFSET ${offsetOf(page)}`),
      db.execute(sql`SELECT count(*)::int AS n FROM threat_groups t ${where}`),
    ]);
    c.header('Cache-Control', 'private, max-age=600');
    return c.json(listEnvelope(c, page, LIST_PARAMS, Number(counted[0].n), rows.map(row => serializeActorItem(row))), 200);
  }, invalidQuery);

  v1.openapi(detailRoute, async c => {
    const id = c.req.valid('param').id;
    const db = getDb();
    const actor = await resolveActor(db, id);
    if (!actor) return unknownActor(c, id) as any;
    const { rows: software } = await db.execute(sql`
      SELECT sw.attack_id, sw.name, sw.software_type FROM actor_software x JOIN attack_software sw ON sw.stix_id = x.software_stix_id
      WHERE x.threat_group_id = ${actor.id} ORDER BY lower(sw.name)
    `);
    c.header('Cache-Control', 'private, max-age=600');
    return c.json(serializeActorDetail(actor, software), 200);
  });

  v1.openapi(articlesRoute, async c => {
    const id = c.req.valid('param').id;
    const q = c.req.valid('query');
    if (pageTooDeep(q)) return tooDeep(c) as any;
    const db = getDb();
    const actor = await resolveActor(db, id);
    if (!actor) return unknownActor(c, id) as any;
    const { rows } = await db.execute(sql`
      SELECT ${NEWS_COLUMNS} FROM articles a
      WHERE ${CURATED_ARTICLES} AND EXISTS (SELECT 1 FROM article_threat_groups g WHERE g.article_id = a.id AND g.threat_group_id = ${actor.id})
      ORDER BY a.published_at DESC, a.id DESC LIMIT ${q.page_size} OFFSET ${offsetOf(q)}
    `);
    c.header('Cache-Control', 'private, max-age=120');
    return c.json(listEnvelope(c, q, SUB_PARAMS, Number(actor.article_count), rows.map(serializeNewsItem)), 200);
  }, invalidQuery);

  v1.openapi(techniquesRoute, async c => {
    const id = c.req.valid('param').id;
    const q = c.req.valid('query');
    if (pageTooDeep(q)) return tooDeep(c) as any;
    const db = getDb();
    const actor = await resolveActor(db, id);
    if (!actor) return unknownActor(c, id) as any;
    const { rows } = await db.execute(sql`
      SELECT at.attack_id, at.name, at.tactics, at.is_subtechnique, at.parent_attack_id, x.description AS procedure
      FROM actor_techniques x JOIN attack_techniques at ON at.stix_id = x.technique_stix_id
      WHERE x.threat_group_id = ${actor.id} AND at.status = 'active'
      ORDER BY at.attack_id LIMIT ${q.page_size} OFFSET ${offsetOf(q)}
    `);
    c.header('Cache-Control', 'private, max-age=600');
    return c.json(listEnvelope(c, q, SUB_PARAMS, Number(actor.technique_count), rows.map(serializeActorTechnique)), 200);
  }, invalidQuery);

  v1.openapi(cvesRoute, async c => {
    const id = c.req.valid('param').id;
    const q = c.req.valid('query');
    if (pageTooDeep(q)) return tooDeep(c) as any;
    const db = getDb();
    const actor = await resolveActor(db, id);
    if (!actor) return unknownActor(c, id) as any;
    // One row per CVE: its strongest link, and every source that links it.
    const { rows } = await db.execute(sql`
      SELECT l.*, v.published_date, ${SCORE_COLUMNS}, (k.cve_id IS NOT NULL) AS is_kev FROM (
        SELECT DISTINCT ON (x.cve_id) x.cve_id, x.confidence, x.evidence, x.evidence_url,
               array_agg(x.source) OVER (PARTITION BY x.cve_id) AS sources
        FROM actor_cves x WHERE x.threat_group_id = ${actor.id}
        ORDER BY x.cve_id, CASE x.confidence WHEN 'high' THEN 0 ELSE 1 END, x.source
      ) l
      LEFT JOIN vulnerabilities v ON v.id = l.cve_id LEFT JOIN cve_scores s ON s.cve_id = l.cve_id
      LEFT JOIN known_exploited_vulnerabilities k ON k.cve_id = l.cve_id
      ORDER BY CASE l.confidence WHEN 'high' THEN 0 ELSE 1 END, v.published_date DESC NULLS LAST, l.cve_id DESC
      LIMIT ${q.page_size} OFFSET ${offsetOf(q)}
    `);
    c.header('Cache-Control', 'private, max-age=600');
    return c.json(listEnvelope(c, q, SUB_PARAMS, Number(actor.cve_count), rows.map(serializeActorCve)), 200);
  }, invalidQuery);
}
