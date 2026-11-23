// Collects CVSS 4.0 vectors with their published scores from CVE Program records (data only), for
// scripts/check-cvss4-published.ts (WHA-29). About a third of recent CVEs carry a CNA-published v4.0 score.
//   npx tsx scripts/collect-cvss4-samples.ts <sample size> <output json>
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const size = Number(process.argv[2]) || 1500;
const out = process.argv[3];
const sql: any = neon(process.env.DATABASE_URL!);
const ids: string[] = (
  await sql`SELECT id FROM vulnerabilities WHERE published_date >= now() - interval '14 months' AND published_date < now() - interval '3 days' ORDER BY random() LIMIT ${size}`
).map((r: any) => r.id);

const found: { cve: string; source: string; vector: string; score: number }[] = [];
let fetched = 0;
let failed = 0;
let next = 0;

async function worker() {
  while (next < ids.length) {
    const id = ids[next++];
    try {
      const res = await fetch(`https://cveawg.mitre.org/api/cve/${id}`, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) { failed++; continue; }
      const record: any = await res.json();
      fetched++;
      const containers = [{ name: record.containers?.cna?.providerMetadata?.shortName ?? 'cna', c: record.containers?.cna }, ...(record.containers?.adp ?? []).map((a: any) => ({ name: a.providerMetadata?.shortName ?? 'adp', c: a }))];
      for (const { name, c } of containers) {
        for (const metric of c?.metrics ?? []) {
          const v = metric.cvssV4_0;
          if (v?.vectorString && typeof v.baseScore === 'number') found.push({ cve: id, source: name, vector: v.vectorString, score: v.baseScore });
        }
      }
    } catch { failed++; }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));

const unique = new Map(found.map((f) => [f.vector, f]));
writeFileSync(out, JSON.stringify(found, null, 1));
console.log(`sampled ${ids.length} CVEs, fetched ${fetched}, failed ${failed}; v4.0 entries ${found.length}, distinct vectors ${unique.size}`);
process.exit(0);
