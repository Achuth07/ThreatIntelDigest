// Loads cve_scores from a CVE List extract made by scripts/cvelist_extract.py (WHA-53).
// Keeps only CVEs stored in vulnerabilities. Safe to re-run: a row is only rewritten when the
// record is newer than the stored one.
// Usage: npx tsx scripts/backfill_cvelist.ts <cvelist.ndjson>
import 'dotenv/config';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { sql } from 'drizzle-orm';
import { getDb } from '../server/db.js';
import { parseCveRecord, upsertCveScores, type CveScoreRow } from '../server/services/cvelist.js';

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: backfill_cvelist.ts <cvelist.ndjson>');
  const db = getDb();
  const { rows: ids } = await db.execute(sql`SELECT id FROM vulnerabilities`);
  const stored = new Set(ids.map((row: any) => row.id as string));

  let records = 0, kept = 0, written = 0;
  let batch: CveScoreRow[] = [];
  for await (const line of createInterface({ input: createReadStream(file), crlfDelay: Infinity })) {
    if (!line) continue;
    records++;
    const row = parseCveRecord(JSON.parse(line));
    if (!row || !stored.has(row.cveId)) continue;
    batch.push(row);
    kept++;
    if (batch.length === 5000) { written += await upsertCveScores(db as any, batch); batch = []; console.log(`${records} records read, ${kept} kept`); }
  }
  written += await upsertCveScores(db as any, batch);
  console.log(`Done: ${records} records read, ${kept} with scores for stored CVEs, ${written} rows written`);
  process.exit(0);
}

main().catch(error => {
  console.error('CVE List backfill failed:', error);
  process.exit(1);
});
