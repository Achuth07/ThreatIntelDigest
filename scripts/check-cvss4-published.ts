import { readFileSync } from 'node:fs';
import { METRICS4, calculate4, parseVector4, type Metrics4 } from '../client/src/lib/cvss4';

// Compares client/src/lib/cvss4.ts with CVSS 4.0 scores that CNAs published in CVE Program records (WHA-29).
// The input is a JSON file of { cve, source, vector, score } written by scripts/collect-cvss4-samples.ts.
//   npx tsx scripts/check-cvss4-published.ts <samples.json>
const path = process.argv[2];
if (!path) {
  console.error('Usage: npx tsx scripts/check-cvss4-published.ts <samples.json>');
  process.exit(2);
}

const samples: { cve: string; source: string; vector: string; score: number }[] = JSON.parse(readFileSync(path, 'utf8'));
// One check per distinct vector and score (several CVEs often share them).
const distinct = new Map(samples.map((s) => [`${s.vector}|${s.score}`, s]));

// CNAs differ in what they put in "baseScore": VulDB puts the base score, GitHub puts the threat-adjusted
// score. A published value counts as correct when it equals either reading of the same vector.
const keepGroups = (metrics: Metrics4, groups: string[]): Metrics4 => {
  const copy = { ...metrics };
  for (const def of METRICS4) if (!groups.includes(def.group)) copy[def.key] = 'X';
  return copy;
};

let checked = 0;
let unparsed = 0;
const unexplained: string[] = [];
const reading: Record<string, number> = {};
for (const sample of distinct.values()) {
  const metrics = parseVector4(sample.vector);
  if (!metrics) {
    unparsed++;
    unexplained.push(`${sample.cve} (${sample.source}) could not parse ${sample.vector}`);
    continue;
  }
  checked++;
  const readings: [string, number][] = [
    ['base score', calculate4(keepGroups(metrics, ['base'])).score],
    ['base plus threat score', calculate4(keepGroups(metrics, ['base', 'threat'])).score],
    ['full score', calculate4(metrics).score],
  ];
  const hit = readings.find(([, value]) => Math.abs(value - sample.score) < 1e-9);
  if (hit) reading[hit[0]] = (reading[hit[0]] ?? 0) + 1;
  else unexplained.push(`${sample.cve} (${sample.source}) published ${sample.score}; ${readings.map(([n, v]) => `${n} ${v}`).join(', ')}: ${sample.vector}`);
}

const explained = checked - (unexplained.length - unparsed);
console.log(`Checked ${checked} distinct vectors (${unparsed} not parseable): ${explained} match a reading of the vector ${JSON.stringify(reading)}, ${unexplained.length - unparsed} do not.`);
unexplained.slice(0, 12).forEach((line) => console.log('  ' + line));
// A few publishers do get scores wrong; fail only when more than 1% disagree.
process.exit(unexplained.length > Math.max(1, checked * 0.01) ? 1 : 0);
