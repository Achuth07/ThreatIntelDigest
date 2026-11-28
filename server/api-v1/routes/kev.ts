import { createRoute, z, type OpenAPIHono } from '@hono/zod-openapi';
import { sql, type SQL } from 'drizzle-orm';
import { getDb } from '../../db.js';
import { requireScope } from '../lib/scopes.js';
import {
  ErrorSchema, PageQuery, authErrors, csvValues, errorBody, isoDate, jsonContent, listEnvelope, listSchema, offsetOf,
  pageTooDeep, queryBool, validationDetails, MAX_OFFSET,
} from '../lib/responses.js';
import { BEST_SEVERITY, SCORE_COLUMNS, linkedActors, linkedArticles } from '../lib/cve-sql.js';
import { KevDetailSchema, KevItemSchema, serializeKevDetail, serializeKevItem } from '../serializers/kev.js';
import type { ApiEnv } from '../app.js';

// GET /v1/kev and GET /v1/kev/{cve_id} (WHA-59). Scope: kev:read.
// CISA's Known Exploited Vulnerabilities catalog as its own resource, joined to WhatCyber's
// scores. A KEV entry whose CVE is not in the CVE table yet still appears, without scores.

const CVE_ID = /^CVE-\d{4}-\d{4,}$/i;
const SORTS = ['date_added', '-date_added', 'due_date', '-due_date'] as const;
const INCLUDES = ['articles', 'threat_actors'] as const;

const ListQuery = PageQuery.extend({
  vendor: z.string().trim().min(1).max(100).optional().openapi({ description: "CISA's vendor name or the CPE vendor, case-insensitive, e.g. microsoft." }),
  product: z.string().trim().min(1).max(150).optional().openapi({ description: "CISA's product name or the CPE product, e.g. exchange_server, or vendor:product." }),
  ransomware: z.enum(['known', 'unknown']).optional().openapi({ description: 'Whether CISA knows of use in ransomware campaigns.' }),
  added_after: isoDate.optional().openapi({ description: 'Added to KEV on or after this date.' }),
  added_before: isoDate.optional().openapi({ description: 'Added to KEV before this date.' }),
  due_before: isoDate.optional().openapi({ description: 'Federal remediation due date before this date.' }),
  overdue: queryBool.optional().openapi({ description: 'true: the due date has passed. false: it has not, or there is none.' }),
  sort: z.enum(SORTS).default('-date_added').openapi({ description: 'Prefix with - for descending.' }),
});
const LIST_PARAMS = Object.keys(ListQuery.shape);

const SCOPE = 'kev:read';
const dateOnly = (value: string) => new Date(value).toISOString().slice(0, 10);

const listRoute = createRoute({
  method: 'get', path: '/kev', tags: ['KEV'], summary: 'List CISA Known Exploited Vulnerabilities',
  middleware: [requireScope(SCOPE)] as const,
  request: { query: ListQuery },
  responses: { 200: jsonContent(listSchema(KevItemSchema, 'KevList'), 'A page of KEV entries'), 400: jsonContent(ErrorSchema, 'Invalid parameters'), ...authErrors(SCOPE) },
});

const detailRoute = createRoute({
  method: 'get', path: '/kev/{cve_id}', tags: ['KEV'], summary: 'Get one KEV entry',
  middleware: [requireScope(SCOPE)] as const,
  request: {
    params: z.object({ cve_id: z.string().openapi({ example: 'CVE-2024-3400' }) }),
    query: z.object({ include: z.string().optional().openapi({ description: 'Comma-separated: articles, threat_actors.' }) }),
  },
  responses: { 200: jsonContent(KevDetailSchema, 'The KEV entry'), 400: jsonContent(ErrorSchema, 'Invalid id or include'), 404: jsonContent(ErrorSchema, 'Not in KEV'), ...authErrors(SCOPE) },
});

const COLUMNS = sql`
  k.cve_id, k.vendor_project, k.product, k.vulnerability_name, k.short_description, k.required_action,
  to_char(k.date_added, 'YYYY-MM-DD') AS date_added, to_char(k.due_date, 'YYYY-MM-DD') AS due_date,
  (k.due_date IS NOT NULL AND k.due_date < CURRENT_DATE) AS overdue,
  k.known_ransomware_campaign_use, k.notes, ${SCORE_COLUMNS}, ${BEST_SEVERITY} AS best_severity`;
const FROM = sql`known_exploited_vulnerabilities k LEFT JOIN vulnerabilities v ON v.id = k.cve_id LEFT JOIN cve_scores s ON s.cve_id = k.cve_id`;

// Matches CISA's own names, or the CPE vendor/product they map to in the catalog (kev_product_map).
function catalogMatch(vendor: string | null, product: string | null): SQL {
  return sql`EXISTS (
    SELECT 1 FROM kev_product_map m JOIN products p ON p.id = m.product_id JOIN vendors ve ON ve.id = p.vendor_id
    WHERE m.vendor_project = k.vendor_project AND m.product = k.product
    ${vendor ? sql`AND ve.slug = ${vendor}` : sql``} ${product ? sql`AND p.slug = ${product}` : sql``})`;
}

function filters(q: z.infer<typeof ListQuery>): SQL[] {
  const where: SQL[] = [];
  if (q.product) {
    const [vendorPart, productPart] = q.product.includes(':') ? q.product.toLowerCase().split(':', 2) : [q.vendor?.toLowerCase() ?? null, q.product.toLowerCase()];
    const byName = vendorPart
      ? sql`(lower(k.vendor_project) = ${vendorPart} AND lower(k.product) = ${productPart})`
      : sql`lower(k.product) = ${productPart}`;
    where.push(sql`(${byName} OR ${catalogMatch(vendorPart, productPart)})`);
  } else if (q.vendor) {
    const vendor = q.vendor.toLowerCase();
    where.push(sql`(lower(k.vendor_project) = ${vendor} OR ${catalogMatch(vendor, null)})`);
  }
  if (q.ransomware) where.push(sql`lower(k.known_ransomware_campaign_use) = ${q.ransomware}`);
  if (q.added_after) where.push(sql`k.date_added >= ${dateOnly(q.added_after)}::date`);
  if (q.added_before) where.push(sql`k.date_added < ${dateOnly(q.added_before)}::date`);
  if (q.due_before) where.push(sql`k.due_date < ${dateOnly(q.due_before)}::date`);
  if (q.overdue === true) where.push(sql`k.due_date < CURRENT_DATE`);
  if (q.overdue === false) where.push(sql`(k.due_date IS NULL OR k.due_date >= CURRENT_DATE)`);
  return where;
}

function orderBy(sort: (typeof SORTS)[number]): SQL {
  const dir = sort.startsWith('-') ? sql`DESC` : sql`ASC`;
  return sort.endsWith('due_date')
    ? sql`k.due_date ${dir} NULLS LAST, k.cve_id ${dir}`
    : sql`k.date_added ${dir}, k.cve_id ${dir}`;
}

const badRequest = (c: any, message: string, field: string) =>
  c.json(errorBody(c, 'validation_error', message, { fields: [{ field, message }] }), 400);

export function registerKevRoutes(v1: OpenAPIHono<ApiEnv>) {
  v1.openapi(listRoute, async c => {
    const q = c.req.valid('query');
    const page = { page: q.page, page_size: q.page_size };
    if (pageTooDeep(page)) return badRequest(c, `Pages can reach the first ${MAX_OFFSET.toLocaleString('en')} results.`, 'page') as any;
    const db = getDb();
    const where = filters(q);
    const whereSql = where.length ? sql`WHERE ${sql.join(where, sql` AND `)}` : sql``;
    const [{ rows }, { rows: counted }] = await Promise.all([
      db.execute(sql`SELECT ${COLUMNS} FROM ${FROM} ${whereSql} ORDER BY ${orderBy(q.sort)} LIMIT ${q.page_size} OFFSET ${offsetOf(page)}`),
      db.execute(sql`SELECT count(*)::int AS n FROM known_exploited_vulnerabilities k ${whereSql}`),
    ]);
    c.header('Cache-Control', 'private, max-age=300');
    return c.json(listEnvelope(c, page, LIST_PARAMS, Number(counted[0].n), rows.map(serializeKevItem)), 200);
  }, (result, c) => {
    if (!result.success) return c.json(errorBody(c, 'validation_error', 'Some query parameters are not valid.', validationDetails(result.error.issues)), 400) as any;
  });

  v1.openapi(detailRoute, async c => {
    const raw = c.req.valid('param').cve_id;
    if (!CVE_ID.test(raw)) return badRequest(c, 'Use a CVE id such as CVE-2024-3400.', 'cve_id') as any;
    const id = raw.toUpperCase();
    const parsed = csvValues(c.req.valid('query').include ?? '', INCLUDES);
    if ('bad' in parsed) return badRequest(c, `Unknown include "${parsed.bad}". Use ${INCLUDES.join(', ')}.`, 'include') as any;

    const db = getDb();
    const { rows } = await db.execute(sql`SELECT ${COLUMNS} FROM ${FROM} WHERE k.cve_id = ${id}`);
    if (!rows[0]) return c.json(errorBody(c, 'not_found', `${id} is not in CISA's Known Exploited Vulnerabilities catalog.`), 404) as any;
    const [articles, actors] = await Promise.all([
      parsed.values.includes('articles') ? linkedArticles(db, id) : null,
      parsed.values.includes('threat_actors') ? linkedActors(db, id) : null,
    ]);
    c.header('Cache-Control', 'private, max-age=300');
    return c.json(serializeKevDetail(rows[0], { articles, actors }), 200);
  }, (result, c) => {
    if (!result.success) return c.json(errorBody(c, 'validation_error', 'Some parameters are not valid.', validationDetails(result.error.issues)), 400) as any;
  });
}
