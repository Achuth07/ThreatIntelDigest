import { z } from '@hono/zod-openapi';
import { descriptionFromSearchVector } from '../../services/cve-text.js';
import { toIso, toNumber } from '../lib/responses.js';

// CVE serialisers for v1 (WHA-39, WHA-57): snake_case, UTC ISO 8601 times, numbers for decimals.

const SITE = 'https://www.whatcyber.com';

const Cvss = z.object({
  score: z.number(),
  version: z.string().openapi({ example: '3.1' }),
  severity: z.string().nullable().openapi({ example: 'critical' }),
  vector: z.string().nullable(),
  source: z.enum(['nvd', 'cna', 'cisa']).openapi({ description: 'nvd: from the NVD record. cna: the CVE Numbering Authority. cisa: CISA Vulnrichment.' }),
}).openapi('CvssScore');

export const CveListItemSchema = z.object({
  cve_id: z.string(),
  title: z.string().nullable().openapi({ description: "CISA's name for KEV entries; CVE records have no title otherwise." }),
  description: z.string(),
  published_at: z.string().datetime(),
  modified_at: z.string().datetime(),
  status: z.string().openapi({ description: 'NVD analysis status, e.g. Analyzed, Awaiting Analysis.' }),
  severity: z.string().nullable(),
  cvss: Cvss.nullable().openapi({ description: "NVD's CVSS 3.x, else the CNA's or CISA's 3.x, else 4.0, else NVD's 2.0." }),
  epss: z.object({ score: z.number(), percentile: z.number().nullable() }).nullable(),
  is_kev: z.boolean(),
  weaknesses: z.array(z.string()),
  vendors: z.array(z.string()),
}).openapi('CveListItem');

export const CveDetailSchema = CveListItemSchema.extend({
  metrics: z.object({
    cvss_v4: z.array(Cvss),
    cvss_v3: z.array(Cvss),
    cvss_v2: z.array(Cvss),
  }),
  ssvc: z.object({
    exploitation: z.string().nullable(),
    automatable: z.string().nullable(),
    technical_impact: z.string().nullable(),
    updated_at: z.string().datetime().nullable(),
    source: z.literal('cisa'),
  }).nullable(),
  kev: z.object({
    vendor_project: z.string(), product: z.string(), vulnerability_name: z.string(), date_added: z.string().nullable(),
    due_date: z.string().nullable(), description: z.string(), required_action: z.string(),
    known_ransomware_campaign_use: z.string().nullable(), notes: z.string().nullable(),
  }).nullable(),
  products: z.array(z.object({ vendor: z.string(), vendor_name: z.string(), product: z.string(), product_name: z.string(), versions: z.array(z.string()) })),
  references: z.array(z.object({ url: z.string(), source: z.string().nullable(), tags: z.array(z.string()) })).optional(),
  articles: z.array(z.object({ title: z.string(), url: z.string(), source: z.string(), published_at: z.string().datetime(), whatcyber_url: z.string().nullable() })).optional(),
  threat_actors: z.array(z.object({
    name: z.string(), attack_id: z.string().nullable(), whatcyber_url: z.string().nullable(),
    source: z.enum(['attack', 'news']), confidence: z.enum(['high', 'low']), evidence: z.string().nullable(), evidence_url: z.string().nullable(),
  })).optional(),
  links: z.object({ whatcyber: z.string(), nvd: z.string(), cve_org: z.string() }),
  partial: z.boolean().openapi({ description: 'true when the full record could not be read; Postgres fields are still returned.' }),
}).openapi('CveDetail');

const versionOf = (vector: string | null | undefined, fallback: string) => /^CVSS:(\d\.\d)\//.exec(vector ?? '')?.[1] ?? fallback;
const lower = (value: unknown) => (typeof value === 'string' && value ? value.toLowerCase() : null);
const cisaOr = (source: string | null) => (source === 'adp' ? 'cisa' : 'cna') as 'cna' | 'cisa';

function bestCvss(row: any): z.infer<typeof Cvss> | null {
  if (row.cvss_v3_score !== null) return { score: Number(row.cvss_v3_score), version: versionOf(row.cvss_vector, '3.x'), severity: lower(row.cvss_v3_severity), vector: row.cvss_vector ?? null, source: 'nvd' };
  if (row.cvss3_score !== null) return { score: Number(row.cvss3_score), version: versionOf(row.cvss3_vector, '3.x'), severity: lower(row.cvss3_severity), vector: row.cvss3_vector ?? null, source: cisaOr(row.cvss3_source) };
  if (row.cvss4_score !== null) return { score: Number(row.cvss4_score), version: '4.0', severity: lower(row.cvss4_severity), vector: row.cvss4_vector ?? null, source: cisaOr(row.cvss4_source) };
  if (row.cvss_v2_score !== null) return { score: Number(row.cvss_v2_score), version: '2.0', severity: lower(row.cvss_v2_severity), vector: null, source: 'nvd' };
  return null;
}

export function serializeCveListItem(row: any) {
  const cvss = bestCvss(row);
  return {
    cve_id: row.id,
    title: row.kev_name ?? null,
    description: descriptionFromSearchVector(row.id, row.search_vector, row.vendors),
    published_at: toIso(row.published_date)!,
    modified_at: toIso(row.last_modified_date)!,
    status: row.vuln_status,
    severity: cvss?.severity ?? null,
    cvss,
    epss: row.epss_score !== null ? { score: toNumber(row.epss_score)!, percentile: toNumber(row.epss_percentile) } : null,
    is_kev: row.is_kev === true,
    // NVD can list the same CWE once from itself and once from the CNA; return each once.
    weaknesses: [...new Set<string>(row.weaknesses ?? [])],
    vendors: row.vendors ?? [],
  };
}

interface DetailExtras {
  record: any | null;
  products: any[];
  articles: any[] | null;
  actors: any[] | null;
  includeReferences: boolean;
}

export function serializeCveDetail(row: any, extras: DetailExtras) {
  const base = serializeCveListItem(row);
  const record = extras.record;
  const versions = new Map<string, string[]>();
  for (const p of record?.affectedProducts ?? []) versions.set(`${p.vendor}:${p.product}`, p.versions ?? []);

  const v3: z.infer<typeof Cvss>[] = [];
  if (row.cvss_v3_score !== null) v3.push({ score: Number(row.cvss_v3_score), version: versionOf(row.cvss_vector, '3.x'), severity: lower(row.cvss_v3_severity), vector: row.cvss_vector ?? null, source: 'nvd' });
  if (row.cvss3_score !== null) v3.push({ score: Number(row.cvss3_score), version: versionOf(row.cvss3_vector, '3.x'), severity: lower(row.cvss3_severity), vector: row.cvss3_vector ?? null, source: cisaOr(row.cvss3_source) });

  return {
    ...base,
    description: record?.description?.trim() || base.description,
    metrics: {
      cvss_v4: row.cvss4_score !== null ? [{ score: Number(row.cvss4_score), version: '4.0', severity: lower(row.cvss4_severity), vector: row.cvss4_vector ?? null, source: cisaOr(row.cvss4_source) }] : [],
      cvss_v3: v3,
      cvss_v2: row.cvss_v2_score !== null ? [{ score: Number(row.cvss_v2_score), version: '2.0', severity: lower(row.cvss_v2_severity), vector: null, source: 'nvd' as const }] : [],
    },
    ssvc: row.ssvc_exploitation || row.ssvc_automatable || row.ssvc_technical_impact
      ? { exploitation: row.ssvc_exploitation, automatable: row.ssvc_automatable, technical_impact: row.ssvc_technical_impact, updated_at: toIso(row.ssvc_timestamp), source: 'cisa' as const }
      : null,
    kev: row.is_kev ? {
      vendor_project: row.kev_vendor, product: row.kev_product, vulnerability_name: row.kev_name,
      date_added: toIso(row.kev_date_added)?.slice(0, 10) ?? null, due_date: toIso(row.kev_due_date)?.slice(0, 10) ?? null,
      description: row.kev_description, required_action: row.kev_action,
      known_ransomware_campaign_use: row.kev_ransomware ?? null, notes: row.kev_notes || null,
    } : null,
    products: extras.products.map(p => ({ vendor: p.vendor, vendor_name: p.vendor_name, product: p.product, product_name: p.product_name, versions: versions.get(`${p.vendor}:${p.product}`) ?? [] })),
    ...(extras.includeReferences ? { references: (record?.references ?? []).map((r: any) => ({ url: r.url, source: r.source ?? null, tags: r.tags ?? [] })) } : {}),
    ...(extras.articles ? { articles: extras.articles.map(a => ({ title: a.title, url: a.article_url, source: a.source, published_at: toIso(a.published_at)!, whatcyber_url: a.article_id ? `${SITE}/article/${a.article_id}` : null })) } : {}),
    ...(extras.actors ? { threat_actors: extras.actors.map(a => ({ name: a.name, attack_id: a.attack_id ?? null, whatcyber_url: a.slug ? `${SITE}/threat-actors/${a.slug}` : null, source: a.source, confidence: a.confidence, evidence: a.evidence ?? null, evidence_url: a.evidence_url ?? null })) } : {}),
    links: { whatcyber: `${SITE}/cve/${row.id}`, nvd: `https://nvd.nist.gov/vuln/detail/${row.id}`, cve_org: `https://www.cve.org/CVERecord?id=${row.id}` },
    partial: record === null,
  };
}
