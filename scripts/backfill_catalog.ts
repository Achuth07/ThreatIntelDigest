// Fills the vendor and product catalog for every stored CVE with CPE data, then maps KEV names
// to catalog products (WHA-51). Resumable: each run skips CVEs that already have a cve_products
// row, so an interrupted run picks up where it stopped. Products come from the end of
// search_vector; the few CVEs whose search_vector was cut at 10,000 characters are read from R2.
// Usage: npx tsx scripts/backfill_catalog.ts [--limit N]
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { getDb } from '../server/db.js';
import { fetchCveFromR2 } from '../server/services/r2.js';
import { productsFromSearchVector, rebuildKevProductMap, upsertCatalog, type CatalogEntry } from '../server/services/catalog.js';

const BATCH = 2000;

async function main() {
  const limitFlag = process.argv.indexOf('--limit');
  const limit = limitFlag === -1 ? Infinity : Number(process.argv[limitFlag + 1]);
  const db = getDb();
  let after = '';
  let done = 0, fromR2 = 0;
  const started = Date.now();

  while (done < limit) {
    const { rows } = await db.execute(sql`
      SELECT v.id, v.search_vector, v.vendors FROM vulnerabilities v
      WHERE v.id > ${after} AND jsonb_array_length(v.vendors) > 0
        AND NOT EXISTS (SELECT 1 FROM cve_products cp WHERE cp.cve_id = v.id)
      ORDER BY v.id LIMIT ${Math.min(BATCH, limit - done)}
    `);
    if (rows.length === 0) break;
    const entries: CatalogEntry[] = [];
    for (const row of rows as any[]) {
      let products = productsFromSearchVector(row.id, row.search_vector, row.vendors);
      if (products === null) {
        const record: any = await fetchCveFromR2(row.id);
        products = (record?.affectedProducts ?? []).map((p: any) => ({ vendor: p.vendor, product: p.product }));
        fromR2++;
      }
      entries.push({ cveId: row.id, products: products! });
    }
    await upsertCatalog(db as any, entries);
    done += rows.length;
    after = rows[rows.length - 1].id;
    console.log(`${done} CVEs (${fromR2} read from R2), up to ${after}, ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }

  const kev = await rebuildKevProductMap(db as any);
  console.log(`KEV: ${kev.mapped} of ${kev.entries} entries mapped (${(100 * kev.mapped / kev.entries).toFixed(1)}%), ${kev.unmapped.length} unmatched name pairs`);
  if (kev.unmapped.length) console.log('Unmatched KEV names, for review:\n  ' + kev.unmapped.join('\n  '));
  process.exit(0);
}

main().catch(error => {
  console.error('Catalog backfill failed:', error);
  process.exit(1);
});
