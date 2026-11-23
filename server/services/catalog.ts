import { sql, type SQL } from 'drizzle-orm';
import { descriptionFromSearchVector, SEARCH_VECTOR_MAX } from './cve-text.js';

// Vendor and product catalog from CPE names (WHA-51). See migrations/011_vendor_product_catalog.sql.

export interface CpeProduct { vendor: string; product: string }
export interface CatalogEntry { cveId: string; products: CpeProduct[] }

interface Executor { execute(query: SQL): Promise<{ rows: any[] }> }

// "http_server" -> "Http Server". KEV names replace these where a KEV entry maps to the product.
export function prettifySlug(slug: string): string {
  return slug
    .replace(/\\(.)/g, '$1')
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(word => (/^[a-z]/.test(word) ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

// The products tail of search_vector ("vendor product vendor product"), as nvd.ts writes it.
// Returns null when the value was cut at 10,000 characters; read the R2 record for those.
export function productsFromSearchVector(id: string, searchVector: string | null, vendors: string[] | null): CpeProduct[] | null {
  if (!searchVector) return [];
  if (searchVector.length >= SEARCH_VECTOR_MAX) return null;
  const description = descriptionFromSearchVector(id, searchVector, vendors);
  const body = (searchVector.startsWith(`${id} `) ? searchVector.slice(id.length + 1) : searchVector).trim();
  const tail = body.slice(body.indexOf(description) + description.length).trim();
  if (!tail) return [];
  const tokens = tail.split(' ');
  const products: CpeProduct[] = [];
  for (let i = 0; i + 1 < tokens.length; i += 2) products.push({ vendor: tokens[i], product: tokens[i + 1] });
  return products;
}

const pgIntArray = (ids: number[]) => `{${ids.join(',')}}`;

// Adds any new vendors and products, then sets each CVE's product list. A CVE with no products
// loses its row. Rows whose list did not change are not rewritten.
export async function upsertCatalog(db: Executor, entries: CatalogEntry[]): Promise<{ cves: number; changed: number }> {
  if (entries.length === 0) return { cves: 0, changed: 0 };
  const vendorSlugs = [...new Set(entries.flatMap(entry => entry.products.map(p => p.vendor)))];
  const vendorIds = new Map<string, number>();
  for (let i = 0; i < vendorSlugs.length; i += 1000) {
    const chunk = vendorSlugs.slice(i, i + 1000);
    await db.execute(sql`INSERT INTO vendors (slug, display_name) VALUES ${sql.join(chunk.map(slug => sql`(${slug}, ${prettifySlug(slug)})`), sql`, `)} ON CONFLICT (slug) DO NOTHING`);
    const { rows } = await db.execute(sql`SELECT id, slug FROM vendors WHERE slug IN ${chunk}`);
    for (const row of rows) vendorIds.set(row.slug, row.id);
  }

  const productKeys = [...new Set(entries.flatMap(entry => entry.products.map(p => `${p.vendor}\u0000${p.product}`)))];
  const productIds = new Map<string, number>();
  for (let i = 0; i < productKeys.length; i += 1000) {
    const chunk = productKeys.slice(i, i + 1000).map(key => { const [vendor, product] = key.split('\u0000'); return { vendor, product, vendorId: vendorIds.get(vendor)! }; });
    await db.execute(sql`INSERT INTO products (vendor_id, slug, display_name) VALUES ${sql.join(chunk.map(p => sql`(${p.vendorId}, ${p.product}, ${prettifySlug(p.product)})`), sql`, `)} ON CONFLICT (vendor_id, slug) DO NOTHING`);
    const { rows } = await db.execute(sql`
      SELECT p.id, v.slug AS vendor, p.slug AS product FROM products p JOIN vendors v ON v.id = p.vendor_id
      WHERE (p.vendor_id, p.slug) IN (${sql.join(chunk.map(p => sql`(${p.vendorId}, ${p.product})`), sql`, `)})
    `);
    for (const row of rows) productIds.set(`${row.vendor}\u0000${row.product}`, row.id);
  }

  let changed = 0;
  const withProducts = entries.filter(entry => entry.products.length > 0);
  const empty = entries.filter(entry => entry.products.length === 0).map(entry => entry.cveId);
  for (let i = 0; i < withProducts.length; i += 1000) {
    const chunk = withProducts.slice(i, i + 1000);
    const { rows } = await db.execute(sql`
      INSERT INTO cve_products (cve_id, product_ids)
      VALUES ${sql.join(chunk.map(entry => {
        const ids = [...new Set(entry.products.map(p => productIds.get(`${p.vendor}\u0000${p.product}`)!))].sort((a, b) => a - b);
        return sql`(${entry.cveId}, ${pgIntArray(ids)}::int[])`;
      }), sql`, `)}
      ON CONFLICT (cve_id) DO UPDATE SET product_ids = EXCLUDED.product_ids, updated_at = now()
        WHERE cve_products.product_ids IS DISTINCT FROM EXCLUDED.product_ids
      RETURNING cve_id
    `);
    changed += rows.length;
  }
  if (empty.length) {
    const { rows } = await db.execute(sql`DELETE FROM cve_products WHERE cve_id IN ${empty} RETURNING cve_id`);
    changed += rows.length;
  }
  return { cves: entries.length, changed };
}

// --- KEV name mapping ---

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
const tokens = (value: string) => new Set(value.toLowerCase().replace(/\\./g, ' ').split(/[^a-z0-9]+/).filter(Boolean));

// How well a KEV product name matches a CPE product slug, 0 to 1.
export function nameScore(kevName: string, cpeSlug: string): number {
  const a = normalize(kevName), b = normalize(cpeSlug);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.8;
  const ta = tokens(kevName), tb = tokens(cpeSlug);
  const shared = [...ta].filter(t => tb.has(t)).length;
  return shared === 0 ? 0 : shared / new Set([...ta, ...tb]).size;
}

// A KEV vendor and a CPE vendor are the same when one normalised name contains the other
// ("Palo Alto Networks" / "paloaltonetworks", "Microsoft" / "microsoft").
const sameVendor = (kevVendor: string, cpeVendor: string) => {
  const a = normalize(kevVendor), b = normalize(cpeVendor);
  return !!a && !!b && (a === b || a.includes(b) || b.includes(a));
};

export const NAME_MATCH_THRESHOLD = 0.5;

interface Candidate { productId: number; vendor: string; product: string; cves: number }

export function chooseKevProduct(kevVendor: string, kevProduct: string, candidates: Candidate[]): { productId: number; method: 'cpe-name' | 'cpe-frequency' } | null {
  const sameVendorCandidates = candidates.filter(c => sameVendor(kevVendor, c.vendor));
  const pool = sameVendorCandidates.length ? sameVendorCandidates : candidates;
  let best: Candidate | null = null, bestScore = 0;
  for (const c of pool) {
    const score = nameScore(kevProduct, c.product);
    if (score > bestScore || (score === bestScore && best && c.cves > best.cves)) { best = c; bestScore = score; }
  }
  if (best && bestScore >= NAME_MATCH_THRESHOLD) return { productId: best.productId, method: 'cpe-name' };
  // No name match: the vendor's product named on most of these KEV CVEs.
  if (sameVendorCandidates.length) {
    const top = [...sameVendorCandidates].sort((a, b) => b.cves - a.cves)[0];
    return { productId: top.productId, method: 'cpe-frequency' };
  }
  return null;
}

// Rebuilds kev_product_map from the KEV table and each KEV CVE's CPE products. KEV names that
// map by name also become the products' display names, since CISA's names read better.
export async function rebuildKevProductMap(db: Executor) {
  const { rows: kev } = await db.execute(sql`SELECT cve_id, vendor_project, product FROM known_exploited_vulnerabilities`);
  const { rows: cpe } = await db.execute(sql`
    SELECT k.cve_id, p.id AS product_id, v.slug AS vendor, p.slug AS product
    FROM known_exploited_vulnerabilities k
    JOIN cve_products cp ON cp.cve_id = k.cve_id
    JOIN products p ON p.id = ANY(cp.product_ids)
    JOIN vendors v ON v.id = p.vendor_id
  `);
  const byCve = new Map<string, Candidate[]>();
  for (const row of cpe) byCve.set(row.cve_id, [...(byCve.get(row.cve_id) ?? []), { productId: row.product_id, vendor: row.vendor, product: row.product, cves: 1 }]);

  const groups = new Map<string, { vendor: string; product: string; cves: string[] }>();
  for (const row of kev) {
    const key = `${row.vendor_project}\u0000${row.product}`;
    const group = groups.get(key) ?? { vendor: row.vendor_project, product: row.product, cves: [] as string[] };
    group.cves.push(row.cve_id);
    groups.set(key, group);
  }

  const { rows: allProducts } = await db.execute(sql`SELECT p.id, v.slug AS vendor, p.slug AS product FROM products p JOIN vendors v ON v.id = p.vendor_id`);
  const results: { vendor: string; product: string; productId: number | null; method: string | null; count: number }[] = [];
  for (const group of groups.values()) {
    const tally = new Map<number, Candidate>();
    for (const cveId of group.cves) {
      for (const c of byCve.get(cveId) ?? []) {
        const existing = tally.get(c.productId);
        if (existing) existing.cves++; else tally.set(c.productId, { ...c });
      }
    }
    let choice: { productId: number; method: string } | null = chooseKevProduct(group.vendor, group.product, [...tally.values()]);
    if (!choice) {
      // No CPE data on these CVEs: look the names up in the whole catalog.
      let best: any = null, bestScore = 0;
      for (const p of allProducts) {
        if (!sameVendor(group.vendor, p.vendor)) continue;
        const score = nameScore(group.product, p.product);
        if (score > bestScore) { best = p; bestScore = score; }
      }
      if (best && bestScore >= 0.8) choice = { productId: best.id, method: 'name' };
    }
    results.push({ vendor: group.vendor, product: group.product, productId: choice?.productId ?? null, method: choice?.method ?? null, count: group.cves.length });
  }

  await db.execute(sql`DELETE FROM kev_product_map`);
  for (let i = 0; i < results.length; i += 500) {
    const chunk = results.slice(i, i + 500);
    await db.execute(sql`
      INSERT INTO kev_product_map (vendor_project, product, product_id, method, kev_count)
      VALUES ${sql.join(chunk.map(r => sql`(${r.vendor}, ${r.product}, ${r.productId}, ${r.method}, ${r.count})`), sql`, `)}
    `);
  }
  // CISA's spelling replaces the prettified slug only when it is the same name ("PAN-OS" for
  // "pan-os", "Palo Alto Networks" for "paloaltonetworks"). KEV often names a component or several
  // products ("Chrome Blink", "IOS and IOS XE Software"), which would mislabel the product.
  await db.execute(sql`
    UPDATE products p SET display_name = m.product
    FROM (SELECT DISTINCT ON (product_id) product_id, product FROM kev_product_map WHERE product_id IS NOT NULL ORDER BY product_id, kev_count DESC) m
    WHERE p.id = m.product_id AND p.display_name IS DISTINCT FROM m.product
      AND lower(regexp_replace(m.product, '[^a-zA-Z0-9]+', '', 'g')) = lower(regexp_replace(p.slug, '[^a-zA-Z0-9]+', '', 'g'))
  `);
  await db.execute(sql`
    UPDATE vendors v SET display_name = m.vendor_project
    FROM (SELECT DISTINCT ON (p.vendor_id) p.vendor_id, k.vendor_project FROM kev_product_map k JOIN products p ON p.id = k.product_id
          ORDER BY p.vendor_id, k.kev_count DESC) m
    WHERE v.id = m.vendor_id AND v.display_name IS DISTINCT FROM m.vendor_project
      AND lower(regexp_replace(m.vendor_project, '[^a-zA-Z0-9]+', '', 'g')) = lower(regexp_replace(v.slug, '[^a-zA-Z0-9]+', '', 'g'))
  `);

  const entries = results.reduce((n, r) => n + r.count, 0);
  const mapped = results.filter(r => r.productId !== null).reduce((n, r) => n + r.count, 0);
  return { pairs: results.length, entries, mapped, unmapped: results.filter(r => r.productId === null).map(r => `${r.vendor} / ${r.product} (${r.count})`) };
}
