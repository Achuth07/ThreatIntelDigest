import { z } from '@hono/zod-openapi';
import { toNumber } from '../lib/responses.js';
import { Cvss, LinkedActorSchema, LinkedArticleSchema, SITE, bestCvss, serializeLinkedActor, serializeLinkedArticle } from './cve.js';

// KEV serialisers for v1 (WHA-59). Field names follow CISA's catalog, in snake_case.

export const KevItemSchema = z.object({
  cve_id: z.string(),
  name: z.string().openapi({ description: "CISA's name for the vulnerability." }),
  vendor: z.string().openapi({ description: "CISA's vendor or project name." }),
  product: z.string(),
  description: z.string(),
  required_action: z.string(),
  date_added: z.string().openapi({ description: 'YYYY-MM-DD', example: '2024-04-12' }),
  due_date: z.string().nullable().openapi({ description: 'Remediation deadline for US federal agencies, YYYY-MM-DD.' }),
  overdue: z.boolean(),
  ransomware_use: z.enum(['known', 'unknown']),
  notes: z.string().nullable(),
  severity: z.string().nullable(),
  cvss: Cvss.nullable(),
  epss: z.object({ score: z.number(), percentile: z.number().nullable() }).nullable(),
  links: z.object({ whatcyber: z.string(), cve: z.string(), nvd: z.string() }),
}).openapi('KevEntry');

export const KevDetailSchema = KevItemSchema.extend({
  articles: z.array(LinkedArticleSchema).optional(),
  threat_actors: z.array(LinkedActorSchema).optional(),
}).openapi('KevEntryDetail');

export function serializeKevItem(row: any): z.infer<typeof KevItemSchema> {
  const cvss = bestCvss(row);
  return {
    cve_id: row.cve_id,
    name: row.vulnerability_name,
    vendor: row.vendor_project,
    product: row.product,
    description: row.short_description,
    required_action: row.required_action,
    date_added: row.date_added,
    due_date: row.due_date ?? null,
    overdue: row.overdue === true,
    ransomware_use: String(row.known_ransomware_campaign_use ?? '').toLowerCase() === 'known' ? 'known' : 'unknown',
    notes: row.notes?.trim() || null,
    severity: cvss?.severity ?? (row.best_severity ? String(row.best_severity).toLowerCase() : null),
    cvss,
    epss: row.epss_score !== null && row.epss_score !== undefined ? { score: toNumber(row.epss_score)!, percentile: toNumber(row.epss_percentile) } : null,
    links: {
      whatcyber: `${SITE}/cve/${row.cve_id}`,
      cve: `https://api.whatcyber.com/v1/cves/${row.cve_id}`,
      nvd: `https://nvd.nist.gov/vuln/detail/${row.cve_id}`,
    },
  };
}

export function serializeKevDetail(row: any, extras: { articles: any[] | null; actors: any[] | null }) {
  return {
    ...serializeKevItem(row),
    ...(extras.articles ? { articles: extras.articles.map(serializeLinkedArticle) } : {}),
    ...(extras.actors ? { threat_actors: extras.actors.map(serializeLinkedActor) } : {}),
  };
}
