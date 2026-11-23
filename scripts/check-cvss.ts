import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { calculate, parseVector, toVectorString } from '../client/src/lib/cvss';

// Checks client/src/lib/cvss.ts against the scores NVD stores (WHA-29): every sampled CVE is
// recomputed from its vector and compared with cvss_v3_score. Run it after touching the maths.
//   npx tsx scripts/check-cvss.ts [sampleSize]
(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const sql: any = neon(process.env.DATABASE_URL);
  const size = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 20000;

  const rows = await sql`SELECT id, cvss_vector, cvss_v3_score FROM vulnerabilities
                         WHERE cvss_vector LIKE 'CVSS:3%' AND cvss_v3_score ~ '^[0-9.]+$' ORDER BY random() LIMIT ${size}`;
  let checked = 0;
  let unparsed = 0;
  const wrong: string[] = [];
  const byVersion: Record<string, number> = {};

  for (const row of rows as any[]) {
    const parsed = parseVector(row.cvss_vector);
    if (!parsed) {
      unparsed++;
      continue;
    }
    byVersion[parsed.version] = (byVersion[parsed.version] ?? 0) + 1;
    checked++;
    const expected = Number(row.cvss_v3_score);
    const got = calculate(parsed.metrics, parsed.version).base;
    // The vector string must also survive a round trip.
    if (toVectorString(parsed.metrics, parsed.version) !== row.cvss_vector.split('/').slice(0, 9).join('/')) wrong.push(`${row.id} round trip ${row.cvss_vector}`);
    if (Math.abs(got - expected) > 0.001) wrong.push(`${row.id} ${row.cvss_vector} stored ${expected} computed ${got}`);
  }

  console.log(`Checked ${checked} vectors (${JSON.stringify(byVersion)}), ${unparsed} not parseable, ${wrong.length} mismatches.`);
  wrong.slice(0, 10).forEach((line) => console.log('  ' + line));
  process.exit(wrong.length || unparsed ? 1 : 0);
})().catch((error) => {
  console.error('Check failed:', error);
  process.exit(1);
});
