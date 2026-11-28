import { createRoute, z, type OpenAPIHono } from '@hono/zod-openapi';
import { sql, type SQL } from 'drizzle-orm';
import { getDb } from '../../db.js';
import { fetchCveFromR2 } from '../../services/r2.js';
import { buildPrefixTsQuery } from '../../services/cve-text.js';
import { cleanAttackText } from '../../services/attack-import.js';
import { requireScope } from '../lib/scopes.js';
import {
  ErrorSchema, PageQuery, errorBody, listEnvelope, listSchema, offsetOf, pageTooDeep, validationDetails, MAX_OFFSET,
} from '../lib/responses.js';
import { CveDetailSchema, CveListItemSchema, serializeCveDetail, serializeCveListItem } from '../serializers/cve.js';
import type { ApiEnv } from '../app.js';

// GET /v1/cves and GET /v1/cves/{id} (WHA-57). Scope: catalog:read.
// The list reads Postgres only; the detail adds the R2 record and falls back to Postgres fields
// with "partial": true if R2 cannot be read.

const CVE_ID = /^CVE-\d{4}-\d{4,}$/i;
const SORTS = ['published', '-published', 'modified', '-modified', 'cvss', '-cvss', 'epss', '-epss'] as const;
const SEVERITIES = ['critical', 'high', 'medium', 'low', 'none'] as const;
const INCLUDES = ['references', 'articles', 'threat_actors'] as const;

const isoDate = z.string().refine(value => !Number.isNaN(Date.parse(value)), 'Use an ISO 8601 date, e.g. 2026-01-31 or 2026-01-31T12:00:00Z');
const bool = z.enum(['true', 'false']).transform(value => value === 'true');

const ListQuery = PageQuery.extend({
  search: z.string().trim().min(2).max(200).optional().openapi({ description: 'Words in the ID, description or affected products. The last word matches as a prefix.' }),
  severity: z.string().optional().openapi({ description: 'One or more of critical, high, medium, low, none, comma-separated. Uses the same score as the cvss field.' }),
  vendor: z.string().trim().min(1).max(100).optional().openapi({ description: 'CPE vendor, e.g. apache.' }),
  product: z.string().trim().min(1).max(150).optional().openapi({ description: 'CPE product, e.g. http_server, or vendor:product.' }),
  cwe: z.string().trim().regex(/^(CWE-)?\d+$/i, 'Use a CWE id such as CWE-79').optional(),
  kev: bool.optional().openapi({ description: 'true: only CVEs in CISA KEV. false: only CVEs not in it.' }),
  cvss_gte: z.coerce.number().min(0).max(10).optional(),
  cvss_lte: z.coerce.number().min(0).max(10).optional(),
  epss_gte: z.coerce.number().min(0).max(1).optional(),
  published_after: isoDate.optional(),
  published_before: isoDate.optional(),
  modified_after: isoDate.optional(),
  sort: z.enum(SORTS).default('-published').openapi({ description: 'Prefix with - for descending. CVEs without the value sort last either way.' }),
});

// Parameters that next and previous links carry over.
const LIST_PARAMS = Object.keys(ListQuery.shape);

const DetailQuery = z.object({
  include: z.string().optional().openapi({ description: 'Comma-separated: references, articles, threat_actors.' }),
});

const json = <T extends z.ZodTypeAny>(schema: T, description: string) => ({ description, content: { 'application/json': { schema } } });
const authErrors = {
  401: json(ErrorSchema, 'Missing or invalid API key'),
  403: json(ErrorSchema, 'The key lacks catalog:read'),
  429: json(ErrorSchema, 'Rate limit reached'),
};

const listRoute = createRoute({
  method: 'get', path: '/cves', tags: ['CVEs'], summary: 'List and filter CVEs',
  middleware: [requireScope('catalog:read')] as const,
  request: { query: ListQuery },
  responses: { 200: json(listSchema(CveListItemSchema, 'CveList'), 'A page of CVEs'), 400: json(ErrorSchema, 'Invalid parameters'), ...authErrors },
});

const detailRoute = createRoute({
  method: 'get', path: '/cves/{id}', tags: ['CVEs'], summary: 'Get one CVE',
  middleware: [requireScope('catalog:read')] as const,
  request: { params: z.object({ id: z.string().openapi({ example: 'CVE-2024-3400' }) }), query: DetailQuery },
  responses: { 200: json(CveDetailSchema, 'The CVE'), 400: json(ErrorSchema, 'Invalid id or include'), 404: json(ErrorSchema, 'Unknown CVE'), ...authErrors },
});

// --- SQL building blocks --------------------------------------------------------------------

// The score behind the cvss field: NVD's CVSS 3.x, else the CNA's or CISA's 3.x, else 4.0, else NVD 2.0.
// cvss_v3_score and cvss_v2_score are stored as text, so they are cast to compare as numbers.
const BEST_SCORE = sql`COALESCE(v.cvss_v3_score::numeric, s.cvss3_score, s.cvss4_score, v.cvss_v2_score::numeric)`;
const BEST_SEVERITY = sql`upper(CASE
  WHEN v.cvss_v3_score IS NOT NULL THEN v.cvss_v3_severity
  WHEN s.cvss3_score IS NOT NULL THEN s.cvss3_severity
  WHEN s.cvss4_score IS NOT NULL THEN s.cvss4_severity
  ELSE v.cvss_v2_severity END)`;

const LIST_COLUMNS = sql`
  v.id, v.published_date, v.last_modified_date, v.vuln_status, v.cvss_v3_score, v.cvss_v3_severity, v.cvss_v2_score,
  v.cvss_v2_severity, v.cvss_vector, v.weaknesses, v.vendors, v.epss_score, v.epss_percentile, v.search_vector,
  s.cvss3_score, s.cvss3_severity, s.cvss3_vector, s.cvss3_source, s.cvss4_score, s.cvss4_severity, s.cvss4_vector, s.cvss4_source,
  k.vulnerability_name AS kev_name, (k.cve_id IS NOT NULL) AS is_kev, ${BEST_SCORE} AS best_score`;

const FROM = sql`vulnerabilities v LEFT JOIN cve_scores s ON s.cve_id = v.id LEFT JOIN known_exploited_vulnerabilities k ON k.cve_id = v.id`;

function orderBy(sort: (typeof SORTS)[number]): SQL {
  const dir = sort.startsWith('-') ? sql`DESC` : sql`ASC`;
  switch (sort.replace('-', '')) {
    case 'modified': return sql`v.last_modified_date ${dir}, v.id ${dir}`;
    case 'epss': return sql`v.epss_score ${dir} NULLS LAST, v.published_date DESC, v.id DESC`;
    case 'cvss': return sql`${BEST_SCORE} ${dir} NULLS LAST, v.published_date DESC, v.id DESC`;
    default: return sql`v.published_date ${dir}, v.last_modified_date ${dir}, v.id ${dir}`;
  }
}

interface Plan { candidates: SQL[]; filters: SQL[]; empty: boolean }

async function plan(db: any, q: z.infer<typeof ListQuery>): Promise<Plan | { error: string; field: string }> {
  const candidates: SQL[] = [];
  const filters: SQL[] = [];

  if (q.search) {
    const tsQuery = buildPrefixTsQuery(q.search);
    if (!tsQuery) return { error: 'Use letters or digits in search.', field: 'search' };
    candidates.push(sql`SELECT id FROM vulnerabilities WHERE to_tsvector('english', COALESCE(search_vector, '')) @@ to_tsquery('english', ${tsQuery})`);
  }
  if (q.vendor) candidates.push(sql`SELECT id FROM vulnerabilities WHERE vendors @> ${JSON.stringify([q.vendor.toLowerCase()])}::jsonb`);
  if (q.product) {
    const [vendorPart, productPart] = q.product.includes(':') ? q.product.split(':', 2) : [q.vendor ?? null, q.product];
    const { rows } = await db.execute(sql`
      SELECT p.id FROM products p JOIN vendors ve ON ve.id = p.vendor_id
      WHERE p.slug = ${productPart.toLowerCase()} ${vendorPart ? sql`AND ve.slug = ${vendorPart.toLowerCase()}` : sql``}
    `);
    if (rows.length === 0) return { candidates, filters, empty: true };
    const ids = rows.map((row: any) => Number(row.id));
    candidates.push(sql`SELECT cve_id FROM cve_products WHERE product_ids && ${`{${ids.join(',')}}`}::int[]`);
  }
  if (q.cwe) {
    const cwe = q.cwe.toUpperCase().startsWith('CWE-') ? q.cwe.toUpperCase() : `CWE-${q.cwe}`;
    candidates.push(sql`SELECT id FROM vulnerabilities WHERE weaknesses @> ARRAY[${cwe}]::text[]`);
  }
  if (q.kev === true) candidates.push(sql`SELECT cve_id FROM known_exploited_vulnerabilities`);
  if (q.kev === false) filters.push(sql`k.cve_id IS NULL`);

  if (q.severity) {
    const wanted = q.severity.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    const bad = wanted.find(s => !(SEVERITIES as readonly string[]).includes(s));
    if (bad) return { error: `Unknown severity "${bad}". Use ${SEVERITIES.join(', ')}.`, field: 'severity' };
    filters.push(sql`${BEST_SEVERITY} IN (${sql.join(wanted.map(s => sql`${s.toUpperCase()}`), sql`, `)})`);
  }
  if (q.cvss_gte !== undefined) filters.push(sql`${BEST_SCORE} >= ${q.cvss_gte}`);
  if (q.cvss_lte !== undefined) filters.push(sql`${BEST_SCORE} <= ${q.cvss_lte}`);
  if (q.epss_gte !== undefined) filters.push(sql`v.epss_score >= ${q.epss_gte}`);
  if (q.published_after) filters.push(sql`v.published_date >= ${new Date(q.published_after).toISOString()}::timestamptz`);
  if (q.published_before) filters.push(sql`v.published_date < ${new Date(q.published_before).toISOString()}::timestamptz`);
  if (q.modified_after) filters.push(sql`v.last_modified_date >= ${new Date(q.modified_after).toISOString()}::timestamptz`);
  if (q.cvss_gte !== undefined && q.cvss_lte !== undefined && q.cvss_gte > q.cvss_lte) return { error: 'cvss_gte is greater than cvss_lte.', field: 'cvss_gte' };
  return { candidates, filters, empty: false };
}

const where = (filters: SQL[], extra?: SQL) => {
  const all = extra ? [...filters, extra] : filters;
  return all.length ? sql`WHERE ${sql.join(all, sql` AND `)}` : sql``;
};

// Counts rows exactly up to a cap, then falls back to the planner's estimate (COUNT(*) on large
// sets is costly on Neon). An unfiltered count uses the table statistics.
const COUNT_CAP = 10_000;
async function countRows(db: any, from: SQL, whereSql: SQL, unfiltered: boolean): Promise<{ count: number; estimated: boolean }> {
  if (unfiltered) {
    const { rows } = await db.execute(sql`SELECT reltuples::bigint AS n FROM pg_class WHERE relname = 'vulnerabilities'`);
    return { count: Number(rows[0].n), estimated: true };
  }
  const { rows } = await db.execute(sql`SELECT count(*)::int AS n FROM (SELECT 1 FROM ${from} ${whereSql} LIMIT ${COUNT_CAP + 1}) capped`);
  const n = Number(rows[0].n);
  if (n <= COUNT_CAP) return { count: n, estimated: false };
  const { rows: planRows } = await db.execute(sql`EXPLAIN (FORMAT JSON) SELECT 1 FROM ${from} ${whereSql}`);
  const estimate = Number(planRows[0]['QUERY PLAN'][0]?.Plan?.['Plan Rows'] ?? n);
  return { count: Math.max(estimate, n), estimated: true };
}

export function registerCveRoutes(v1: OpenAPIHono<ApiEnv>) {
  v1.openapi(listRoute, async c => {
    const q = c.req.valid('query');
    const page = { page: q.page, page_size: q.page_size };
    if (pageTooDeep(page)) {
      return c.json(errorBody(c, 'validation_error', `Pages can reach the first ${MAX_OFFSET.toLocaleString('en')} results. Narrow the filters to see more.`, { fields: [{ field: 'page', message: 'Too deep' }] }), 400) as any;
    }
    const db = getDb();
    const planned = await plan(db, q);
    if ('error' in planned) return c.json(errorBody(c, 'validation_error', planned.error, { fields: [{ field: planned.field, message: planned.error }] }), 400) as any;
    if (planned.empty) return c.json(listEnvelope(c, page, LIST_PARAMS, 0, []), 200);

    const offset = offsetOf(page);
    const limit = q.page_size;
    let rows: any[];
    let from: SQL;

    if (planned.candidates.length) {
      // Collect matching ids from their own indexes first, then sort just those. Sorting first
      // would make Postgres walk the date index and test every row, which is slow for rare matches.
      const cand = sql.join(planned.candidates, sql` INTERSECT `);
      from = sql`(${cand}) AS cand(id) JOIN vulnerabilities v ON v.id = cand.id LEFT JOIN cve_scores s ON s.cve_id = v.id LEFT JOIN known_exploited_vulnerabilities k ON k.cve_id = v.id`;
      ({ rows } = await db.execute(sql`
        WITH cand(id) AS MATERIALIZED (${cand})
        SELECT ${LIST_COLUMNS} FROM cand JOIN vulnerabilities v ON v.id = cand.id
        LEFT JOIN cve_scores s ON s.cve_id = v.id LEFT JOIN known_exploited_vulnerabilities k ON k.cve_id = v.id
        ${where(planned.filters)} ORDER BY ${orderBy(q.sort)} LIMIT ${limit} OFFSET ${offset}
      `));
    } else if (q.sort === 'cvss' || q.sort === '-cvss') {
      // The best score spans two tables, so no single index can order it. CVEs with an NVD 3.x
      // score are ordered by that score's index; the rest (about 9%) are sorted directly.
      const dir = q.sort === '-cvss' ? sql`DESC` : sql`ASC`;
      const take = offset + limit;
      from = FROM;
      ({ rows } = await db.execute(sql`
        SELECT * FROM (
          (SELECT ${LIST_COLUMNS} FROM ${FROM} ${where(planned.filters, sql`v.cvss_v3_score IS NOT NULL`)}
           ORDER BY v.cvss_v3_score::numeric ${dir}, v.published_date DESC, v.id DESC LIMIT ${take})
          UNION ALL
          (SELECT ${LIST_COLUMNS} FROM ${FROM} ${where(planned.filters, sql`v.cvss_v3_score IS NULL`)}
           ORDER BY ${BEST_SCORE} ${dir} NULLS LAST, v.published_date DESC, v.id DESC LIMIT ${take})
        ) ranked
        ORDER BY best_score ${dir} NULLS LAST, published_date DESC, id DESC LIMIT ${limit} OFFSET ${offset}
      `));
    } else {
      from = FROM;
      ({ rows } = await db.execute(sql`
        SELECT ${LIST_COLUMNS} FROM ${FROM} ${where(planned.filters)} ORDER BY ${orderBy(q.sort)} LIMIT ${limit} OFFSET ${offset}
      `));
    }

    const unfiltered = planned.candidates.length === 0 && planned.filters.length === 0;
    const { count, estimated } = await countRows(db, from, where(planned.filters), unfiltered);
    c.header('Cache-Control', 'private, max-age=60');
    return c.json(listEnvelope(c, page, LIST_PARAMS, count, rows.map(serializeCveListItem), estimated), 200);
  }, (result, c) => {
    if (!result.success) return c.json(errorBody(c, 'validation_error', 'Some query parameters are not valid.', validationDetails(result.error.issues)), 400) as any;
  });

  v1.openapi(detailRoute, async c => {
    const raw = c.req.valid('param').id;
    if (!CVE_ID.test(raw)) return c.json(errorBody(c, 'validation_error', 'Use a CVE id such as CVE-2024-3400.', { fields: [{ field: 'id', message: 'Not a CVE id' }] }), 400) as any;
    const id = raw.toUpperCase();
    const includes = (c.req.valid('query').include ?? '').split(',').map(s => s.trim()).filter(Boolean);
    const badInclude = includes.find(s => !(INCLUDES as readonly string[]).includes(s));
    if (badInclude) return c.json(errorBody(c, 'validation_error', `Unknown include "${badInclude}". Use ${INCLUDES.join(', ')}.`, { fields: [{ field: 'include', message: 'Unknown value' }] }), 400) as any;

    const db = getDb();
    const { rows } = await db.execute(sql`
      SELECT ${LIST_COLUMNS}, s.ssvc_exploitation, s.ssvc_automatable, s.ssvc_technical_impact, s.ssvc_timestamp,
             k.vendor_project AS kev_vendor, k.product AS kev_product, to_char(k.date_added, 'YYYY-MM-DD') AS kev_date_added, to_char(k.due_date, 'YYYY-MM-DD') AS kev_due_date,
             k.short_description AS kev_description, k.required_action AS kev_action, k.known_ransomware_campaign_use AS kev_ransomware, k.notes AS kev_notes
      FROM ${FROM} WHERE v.id = ${id}
    `);
    const row = rows[0];
    if (!row) return c.json(errorBody(c, 'not_found', `${id} is not in WhatCyber's CVE database.`), 404) as any;

    const [record, products, articles, actors] = await Promise.all([
      fetchCveFromR2(id),
      db.execute(sql`
        SELECT ve.slug AS vendor, ve.display_name AS vendor_name, p.slug AS product, p.display_name AS product_name
        FROM cve_products cp JOIN products p ON p.id = ANY(cp.product_ids) JOIN vendors ve ON ve.id = p.vendor_id
        WHERE cp.cve_id = ${id} ORDER BY ve.slug, p.slug
      `).then((r: any) => r.rows),
      includes.includes('articles')
        ? db.execute(sql`SELECT article_id, title, article_url, source, published_at FROM article_cves WHERE cve_id = ${id} ORDER BY published_at DESC LIMIT 20`).then((r: any) => r.rows)
        : Promise.resolve(null),
      includes.includes('threat_actors')
        ? db.execute(sql`
            SELECT DISTINCT ON (t.id) t.name, t.slug, t.attack_id, c.source, c.confidence, c.evidence, c.evidence_url
            FROM actor_cves c JOIN threat_groups t ON t.id = c.threat_group_id WHERE c.cve_id = ${id}
            ORDER BY t.id, CASE c.confidence WHEN 'high' THEN 0 ELSE 1 END
          `).then((r: any) => r.rows.map((a: any) => ({ ...a, evidence: cleanAttackText(a.evidence) })))
        : Promise.resolve(null),
    ]);

    c.header('Cache-Control', 'private, max-age=300');
    return c.json(serializeCveDetail(row, { record, products, articles, actors, includeReferences: includes.includes('references') }), 200);
  }, (result, c) => {
    if (!result.success) return c.json(errorBody(c, 'validation_error', 'Some parameters are not valid.', validationDetails(result.error.issues)), 400) as any;
  });
}
