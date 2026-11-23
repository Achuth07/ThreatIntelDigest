/**
 * Data for the vendor and CWE hub pages (WHA-24).
 *
 * Plain SQL over a neon client passed in, so the page function (api/page.ts) and the JSON API
 * (api/index.ts) share one set of queries and the numbers on the server-rendered page match the
 * app. Which hubs exist, and their order, comes from the vendor_stats and cwe_stats tables
 * (migrations/009_hub_stats.sql), refreshed once a day by scripts/refresh-hub-stats.ts.
 */

import { slugify, vendorSlug } from '../../client/src/lib/urls.js';

/** The neon tagged-template query function. */
export type Sql = (strings: TemplateStringsArray, ...values: any[]) => PromiseLike<any[]>;

export const TOP_VENDORS = 100;
export const TOP_CWES = 50;
/** A hub is only indexed when it has at least this many CVEs; the top lists are far above it. */
export const MIN_CVES_FOR_INDEX = 20;
export const HUB_LIST_SIZE = 25;
/** A product gets a page when CISA lists at least this many of its vulnerabilities. */
export const MIN_KEV_FOR_PRODUCT = 5;
export const TOP_PRODUCTS = 60;
export const NEWS_SIZE = 6;

// Vendor names that are also everyday words: matching them in article titles brings in unrelated news.
const AMBIGUOUS_NEWS_VENDORS = new Set(['progress', 'python', 'eclipse', 'zoom', 'elastic', 'canonical', 'vim', 'gnu', 'sap', 'hp', 'f5', 'go', 'golang']);

// KEV product names that name no single product.
const GENERIC_PRODUCT = /\b(multiple|various)\b|mobile devices|chipsets/i;

// ---------------------------------------------------------------------------------------------
// Names

// Names the rules below get wrong, for vendors CISA does not list.
const NAME_OVERRIDES: Record<string, string> = {
  fedoraproject: 'Fedora Project',
  redhat: 'Red Hat',
  gitlab: 'GitLab',
  github: 'GitHub',
  wordpress: 'WordPress',
  mozilla: 'Mozilla',
  arubanetworks: 'Aruba Networks',
  linuxfoundation: 'Linux Foundation',
  hcltech: 'HCL Technologies',
  zohocorp: 'Zoho',
  deltaww: 'Delta Electronics',
  rockwellautomation: 'Rockwell Automation',
  mediawiki: 'MediaWiki',
  ffmpeg: 'FFmpeg',
  freerdp: 'FreeRDP',
  concretecms: 'Concrete CMS',
  zephyrproject: 'Zephyr Project',
  netapp: 'NetApp',
  totolink: 'TOTOLINK',
  openclaw: 'OpenClaw',
  irfanview: 'IrfanView',
  'open-emr': 'OpenEMR',
  'pdf-xchange': 'PDF-XChange',
  wwbn: 'WWBN',
  openatom: 'OpenAtom',
  gpac: 'GPAC',
  wavlink: 'WAVLINK',
};

/** "palo_alto_networks" -> "Palo Alto Networks"; short names are acronyms: "ibm" -> "IBM". */
export function prettifyVendor(vendor: string): string {
  const key = vendor.toLowerCase().replace(/_/g, '-');
  if (NAME_OVERRIDES[key]) return NAME_OVERRIDES[key];
  return vendor
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => (word.length <= 3 ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1)))
    .join(' ');
}

/**
 * The form a vendor name takes to be compared across sources: letters and digits only. NVD writes
 * "paloaltonetworks" and CISA writes "Palo Alto Networks"; both become "paloaltonetworks".
 */
export const normalizeVendor = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

// Vendors that are individuals or tutorial-code publishers (the SourceCodester family). They have
// many CVEs but make poor landing pages, so they are skipped when choosing the top vendors.
export const EXCLUDED_VENDORS = new Set([
  'oretnom23',
  'campcodes',
  'phpgurukul',
  'projectworlds',
  'angeljudesuarez',
  'mayurik',
  'code-projects',
  'fabian',
  'itsourcecode',
  'janobe',
  'wegia',
]);

// ---------------------------------------------------------------------------------------------
// Shapes

export interface HubCve {
  id: string;
  publishedDate: string | null;
  severity: string | null;
  score: number | null;
}

export interface HubKev {
  cveId: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string | null;
  knownRansomwareCampaignUse: string | null;
}

export interface SeverityCounts {
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

export interface ProductLink {
  slug: string;
  name: string;
  kevCount: number;
}

export interface HubNews {
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
}

export interface VendorHub {
  slug: string;
  vendor: string;
  name: string;
  cveCount: number;
  kevCount: number;
  severity: SeverityCounts;
  recent: HubCve[];
  kev: HubKev[];
  topWeaknesses: { id: string; name: string | null; count: number }[];
  /** Products with known exploited vulnerabilities that have their own page. */
  products: ProductLink[];
  news: HubNews[];
}

export interface CweHub {
  id: string;
  name: string | null;
  category: string | null;
  description: string | null;
  cveCount: number;
  kevCount: number;
  severity: SeverityCounts;
  recent: HubCve[];
  kev: HubKev[];
  /** Vendors with the most CVEs for this weakness. `slug` is set when the vendor has a page. */
  topVendors: { slug: string | null; name: string; count: number }[];
}

export interface ProductHub {
  vendorSlug: string;
  productSlug: string;
  vendorName: string;
  productName: string;
  kevCount: number;
  /** The vendor's hub page, when it has one. */
  vendorHub: { slug: string; name: string } | null;
  kev: HubKev[];
  /** Newest CVEs whose description names this vendor and product. */
  recent: HubCve[];
}

export interface VendorIndexRow {
  slug: string;
  name: string;
  cveCount: number;
  kevCount: number;
}

export interface CweIndexRow {
  id: string;
  name: string | null;
  cveCount: number;
  kevCount: number;
}

// ---------------------------------------------------------------------------------------------
// Mapping helpers

const num = (value: unknown) => (value === null || value === undefined || value === '' ? null : Number(value));
const iso = (value: unknown) => (value ? new Date(value as any).toISOString() : null);

const mapCve = (r: any): HubCve => ({
  id: r.id,
  publishedDate: iso(r.published_date),
  severity: r.cvss_v3_severity ?? null,
  score: num(r.cvss_v3_score),
});

const mapKev = (r: any): HubKev => ({
  cveId: r.cve_id,
  vendorProject: r.vendor_project,
  product: r.product,
  vulnerabilityName: r.vulnerability_name,
  dateAdded: iso(r.date_added),
  knownRansomwareCampaignUse: r.known_ransomware_campaign_use ?? null,
});

function severityFrom(rows: any[]): SeverityCounts {
  const out: SeverityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const r of rows) {
    const key = String(r.severity ?? '').toUpperCase() as keyof SeverityCounts;
    if (key in out) out[key] = Number(r.n);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Indexes

export async function getVendorIndex(sql: Sql): Promise<VendorIndexRow[]> {
  const rows = await sql`SELECT slug, display_name, cve_count, kev_count FROM vendor_stats ORDER BY rank LIMIT ${TOP_VENDORS}`;
  return rows.map((r) => ({ slug: r.slug, name: r.display_name, cveCount: Number(r.cve_count), kevCount: Number(r.kev_count) }));
}

export async function getCweIndex(sql: Sql): Promise<CweIndexRow[]> {
  const rows = await sql`SELECT s.id, c.name, s.cve_count, s.kev_count
                         FROM cwe_stats s LEFT JOIN cwe_categories c ON c.id = s.id
                         ORDER BY s.rank LIMIT ${TOP_CWES}`;
  return rows.map((r) => ({ id: r.id, name: r.name ?? null, cveCount: Number(r.cve_count), kevCount: Number(r.kev_count) }));
}

// ---------------------------------------------------------------------------------------------
// Detail hubs. null = no such hub (not in the stats table, so not a page).

export async function getVendorHub(sql: Sql, slug: string): Promise<VendorHub | null> {
  const stat = (await sql`SELECT slug, vendor, display_name, cve_count, kev_count FROM vendor_stats WHERE slug = ${slug}`)[0];
  if (!stat) return null;
  const filter = JSON.stringify([stat.vendor]);

  const newsEligible = !AMBIGUOUS_NEWS_VENDORS.has(stat.slug) && stat.display_name.length >= 3;
  const newsPattern = `\\m${stat.display_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\M`;

  const [recent, severity, kev, weaknesses, products, news] = await Promise.all([
    sql`SELECT id, published_date, cvss_v3_severity, cvss_v3_score FROM vulnerabilities
        WHERE vendors @> ${filter}::jsonb ORDER BY published_date DESC, id DESC LIMIT ${HUB_LIST_SIZE}`,
    sql`SELECT cvss_v3_severity AS severity, count(*)::int AS n FROM vulnerabilities
        WHERE vendors @> ${filter}::jsonb GROUP BY 1`,
    sql`SELECT cve_id, vendor_project, product, vulnerability_name, date_added, known_ransomware_campaign_use
        FROM known_exploited_vulnerabilities
        WHERE lower(regexp_replace(vendor_project, '[^a-zA-Z0-9]+', '', 'g')) = ${normalizeVendor(stat.vendor)}
        ORDER BY date_added DESC LIMIT ${HUB_LIST_SIZE}`,
    sql`SELECT w AS id, count(*)::int AS n FROM vulnerabilities, unnest(weaknesses) AS w
        WHERE vendors @> ${filter}::jsonb AND w LIKE 'CWE-%' GROUP BY w ORDER BY n DESC LIMIT 5`,
    sql`SELECT product_slug, product_name, kev_count FROM product_stats WHERE vendor_slug = ${stat.slug} ORDER BY kev_count DESC, product_name LIMIT 12`,
    newsEligible
      ? sql`SELECT title, url, source, published_at FROM articles WHERE title ~* ${newsPattern} ORDER BY published_at DESC LIMIT ${NEWS_SIZE}`
      : Promise.resolve([] as any[]),
  ]);

  const names = weaknesses.length
    ? await sql`SELECT id, name FROM cwe_categories WHERE id = ANY(${weaknesses.map((w: any) => w.id)})`
    : [];
  const nameOf = new Map(names.map((n: any) => [n.id, n.name]));

  return {
    slug: stat.slug,
    vendor: stat.vendor,
    name: stat.display_name,
    cveCount: Number(stat.cve_count),
    kevCount: Number(stat.kev_count),
    severity: severityFrom(severity),
    recent: recent.map(mapCve),
    kev: kev.map(mapKev),
    topWeaknesses: weaknesses.map((w: any) => ({ id: w.id, name: (nameOf.get(w.id) as string) ?? null, count: Number(w.n) })),
    products: products.map((p: any) => ({ slug: p.product_slug, name: p.product_name, kevCount: Number(p.kev_count) })),
    news: news.map((n: any) => ({ title: n.title, url: n.url, source: n.source, publishedAt: iso(n.published_at) })),
  };
}

export async function getCweHub(sql: Sql, id: string): Promise<CweHub | null> {
  const stat = (await sql`SELECT id, cve_count, kev_count, top_vendors FROM cwe_stats WHERE id = ${id}`)[0];
  if (!stat) return null;

  const [meta, recent, severity, kev] = await Promise.all([
    sql`SELECT name, category, description FROM cwe_categories WHERE id = ${id}`,
    sql`SELECT id, published_date, cvss_v3_severity, cvss_v3_score FROM vulnerabilities
        WHERE weaknesses @> ARRAY[${id}]::text[] ORDER BY published_date DESC, id DESC LIMIT ${HUB_LIST_SIZE}`,
    sql`SELECT cvss_v3_severity AS severity, count(*)::int AS n FROM vulnerabilities
        WHERE weaknesses @> ARRAY[${id}]::text[] GROUP BY 1`,
    sql`SELECT k.cve_id, k.vendor_project, k.product, k.vulnerability_name, k.date_added, k.known_ransomware_campaign_use
        FROM known_exploited_vulnerabilities k JOIN vulnerabilities v ON v.id = k.cve_id
        WHERE v.weaknesses @> ARRAY[${id}]::text[] ORDER BY k.date_added DESC LIMIT ${HUB_LIST_SIZE}`,
  ]);

  return {
    id: stat.id,
    name: meta[0]?.name ?? null,
    category: meta[0]?.category ?? null,
    description: meta[0]?.description ?? null,
    cveCount: Number(stat.cve_count),
    kevCount: Number(stat.kev_count),
    severity: severityFrom(severity),
    recent: recent.map(mapCve),
    kev: kev.map(mapKev),
    topVendors: Array.isArray(stat.top_vendors) ? stat.top_vendors : [],
  };
}

export async function getProductHub(sql: Sql, vendorSlugValue: string, productSlug: string): Promise<ProductHub | null> {
  const stat = (
    await sql`SELECT vendor_slug, product_slug, vendor_name, product_name, kev_count FROM product_stats
              WHERE vendor_slug = ${vendorSlugValue} AND product_slug = ${productSlug}`
  )[0];
  if (!stat) return null;

  const [kev, recent, vendor] = await Promise.all([
    sql`SELECT cve_id, vendor_project, product, vulnerability_name, date_added, known_ransomware_campaign_use
        FROM known_exploited_vulnerabilities
        WHERE lower(regexp_replace(vendor_project, '[^a-zA-Z0-9]+', '', 'g')) = ${normalizeVendor(stat.vendor_name)}
          AND product = ${stat.product_name}
        ORDER BY date_added DESC LIMIT ${HUB_LIST_SIZE}`,
    // The CVE descriptions are full-text indexed (idx_vulnerabilities_fts); match vendor and product names.
    sql`SELECT id, published_date, cvss_v3_severity, cvss_v3_score FROM vulnerabilities
        WHERE to_tsvector('english'::regconfig, COALESCE(search_vector, '')) @@ plainto_tsquery('english', ${`${stat.vendor_name} ${stat.product_name}`})
        ORDER BY published_date DESC, id DESC LIMIT ${HUB_LIST_SIZE}`,
    sql`SELECT slug, display_name FROM vendor_stats WHERE slug = ${stat.vendor_slug}`,
  ]);

  return {
    vendorSlug: stat.vendor_slug,
    productSlug: stat.product_slug,
    vendorName: stat.vendor_name,
    productName: stat.product_name,
    kevCount: Number(stat.kev_count),
    vendorHub: vendor[0] ? { slug: vendor[0].slug, name: vendor[0].display_name } : null,
    kev: kev.map(mapKev),
    recent: recent.map(mapCve),
  };
}

/** Vendor hubs that exist for these NVD vendor values. Used to link from CVE pages. */
export async function getHubVendorSlugs(sql: Sql, vendors: string[]): Promise<{ slug: string; name: string }[]> {
  if (!vendors.length) return [];
  const slugs = vendors.map(vendorSlug);
  const rows = await sql`SELECT slug, display_name FROM vendor_stats WHERE slug = ANY(${slugs}) ORDER BY rank`;
  return rows.map((r) => ({ slug: r.slug, name: r.display_name }));
}

/** Which of these CWE ids have a hub. */
export async function getHubCweIds(sql: Sql, ids: string[]): Promise<string[]> {
  const wanted = ids.filter((i) => /^CWE-\d+$/i.test(i)).map((i) => i.toUpperCase());
  if (!wanted.length) return [];
  const rows = await sql`SELECT id FROM cwe_stats WHERE id = ANY(${wanted})`;
  return rows.map((r) => r.id);
}

// ---------------------------------------------------------------------------------------------
// Daily refresh

/**
 * Recomputes vendor_stats and cwe_stats. `client` is the neon client (it needs .transaction), so
 * the tables are swapped in one step and a page never sees a half-filled list.
 */
export async function refreshHubStats(client: any): Promise<{ vendors: number; cwes: number; products: number }> {
  const vendors = await client`SELECT v AS vendor, count(*)::int AS n FROM vulnerabilities, jsonb_array_elements_text(vendors) AS v
                               GROUP BY v ORDER BY n DESC LIMIT ${TOP_VENDORS * 3}`;  // spare rows: excluded and duplicate vendors are skipped
  const cwes = await client`SELECT w AS id, count(*)::int AS n FROM vulnerabilities, unnest(weaknesses) AS w
                            WHERE w LIKE 'CWE-%' GROUP BY w ORDER BY n DESC LIMIT ${TOP_CWES}`;
  const kevByVendor = await client`SELECT lower(regexp_replace(vendor_project, '[^a-zA-Z0-9]+', '', 'g')) AS vendor,
                                          min(vendor_project) AS display, count(*)::int AS n
                                   FROM known_exploited_vulnerabilities GROUP BY 1`;
  const kevByCwe = await client`SELECT w AS id, count(*)::int AS n
                                FROM known_exploited_vulnerabilities k JOIN vulnerabilities v ON v.id = k.cve_id, unnest(v.weaknesses) AS w
                                GROUP BY w`;

  const kevVendor = new Map<string, { display: string; n: number }>(
    kevByVendor.map((r: any) => [r.vendor, { display: r.display, n: Number(r.n) }])
  );
  const kevCwe = new Map<string, number>(kevByCwe.map((r: any) => [r.id, Number(r.n)]));

  // Two NVD vendor values can share one address ("a_b" and "a-b"); the bigger one keeps it.
  const seen = new Set<string>();
  const vendorRows: { slug: string; vendor: string; name: string; n: number; kev: number }[] = [];
  for (const r of vendors as any[]) {
    const slug = vendorSlug(r.vendor);
    if (!slug || seen.has(slug) || EXCLUDED_VENDORS.has(slug)) continue;
    seen.add(slug);
    const kev = kevVendor.get(normalizeVendor(r.vendor));
    vendorRows.push({ slug, vendor: r.vendor, name: kev?.display ?? prettifyVendor(r.vendor), n: Number(r.n), kev: kev?.n ?? 0 });
    if (vendorRows.length === TOP_VENDORS) break;
  }

  // Most affected vendors per weakness, from one grouped scan of (weakness, vendor) pairs.
  const pairs = await client`SELECT w AS cwe, v AS vendor, count(*)::int AS n
                             FROM vulnerabilities, unnest(weaknesses) AS w, jsonb_array_elements_text(vendors) AS v
                             WHERE w LIKE 'CWE-%' GROUP BY w, v`;
  const hubBySlug = new Map(vendorRows.map((v) => [v.slug, v]));
  const topVendorsByCwe = new Map<string, { slug: string | null; name: string; count: number }[]>();
  const wantedCwes = new Set((cwes as any[]).map((c) => c.id));
  for (const r of (pairs as any[]).sort((a, b) => Number(b.n) - Number(a.n))) {
    if (!wantedCwes.has(r.cwe)) continue;
    const slug = vendorSlug(r.vendor);
    if (EXCLUDED_VENDORS.has(slug)) continue;
    const list = topVendorsByCwe.get(r.cwe) ?? [];
    if (list.length >= 8) continue;
    const hub = hubBySlug.get(slug);
    list.push({ slug: hub ? slug : null, name: hub?.name ?? prettifyVendor(r.vendor), count: Number(r.n) });
    topVendorsByCwe.set(r.cwe, list);
  }

  // Products: KEV products with enough entries, under the vendor hub slug when the vendor has one.
  const kevProducts = await client`SELECT vendor_project, product, count(*)::int AS n FROM known_exploited_vulnerabilities
                                   GROUP BY vendor_project, product HAVING count(*) >= ${MIN_KEV_FOR_PRODUCT} ORDER BY n DESC`;
  const slugByNormalized = new Map(vendorRows.map((v) => [normalizeVendor(v.vendor), v.slug]));
  const productRows: { vendorSlug: string; productSlug: string; vendorName: string; productName: string; n: number }[] = [];
  const productSeen = new Set<string>();
  for (const r of kevProducts as any[]) {
    if (GENERIC_PRODUCT.test(r.product)) continue;
    const vSlug = slugByNormalized.get(normalizeVendor(r.vendor_project)) ?? slugify(r.vendor_project);
    const pSlug = slugify(r.product);
    if (!vSlug || !pSlug || productSeen.has(`${vSlug}/${pSlug}`)) continue;
    productSeen.add(`${vSlug}/${pSlug}`);
    productRows.push({ vendorSlug: vSlug, productSlug: pSlug, vendorName: r.vendor_project, productName: r.product, n: Number(r.n) });
    if (productRows.length === TOP_PRODUCTS) break;
  }

  const statements: any[] = [client`DELETE FROM vendor_stats`, client`DELETE FROM cwe_stats`, client`DELETE FROM product_stats`];
  vendorRows.forEach((v, i) => {
    statements.push(
      client`INSERT INTO vendor_stats (slug, vendor, display_name, cve_count, kev_count, rank)
             VALUES (${v.slug}, ${v.vendor}, ${v.name}, ${v.n}, ${v.kev}, ${i + 1})`
    );
  });
  (cwes as any[]).forEach((c, i) => {
    statements.push(
      client`INSERT INTO cwe_stats (id, cve_count, kev_count, rank, top_vendors)
             VALUES (${c.id}, ${Number(c.n)}, ${kevCwe.get(c.id) ?? 0}, ${i + 1}, ${JSON.stringify(topVendorsByCwe.get(c.id) ?? [])}::jsonb)`
    );
  });
  productRows.forEach((p, i) => {
    statements.push(
      client`INSERT INTO product_stats (vendor_slug, product_slug, vendor_name, product_name, kev_count, rank)
             VALUES (${p.vendorSlug}, ${p.productSlug}, ${p.vendorName}, ${p.productName}, ${p.n}, ${i + 1})`
    );
  });
  await client.transaction(statements);

  return { vendors: vendorRows.length, cwes: cwes.length, products: productRows.length };
}
