import { CVSS4_LOOKUP } from '../client/src/lib/cvss4-lookup';
import { BASE_KEYS_4, DEFAULT_METRICS_4, METRICS4, calculate4, macroVector, parseVector4, toVectorString4, type Metric4Key, type Metrics4 } from '../client/src/lib/cvss4';

// Checks client/src/lib/cvss4.ts (WHA-29). Run it after touching the CVSS 4.0 code:
//   npx tsx scripts/check-cvss4.ts
// 1. Scores that NVD and CNAs published for real CVEs (a few; the broad comparison is check-cvss4-published.ts).
// 2. Properties any correct implementation must have (range, no impact, group maximum, monotonic).
let failures = 0;
const fail = (message: string) => {
  failures++;
  if (failures <= 15) console.log('  FAIL ' + message);
};

// 1. Published scores. CVE, vector (non-base metrics left Not Defined), score.
const PUBLISHED: [string, string, number][] = [
  ['CVE-2024-7450 (CNA)', 'CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:L/VI:L/VA:L/SC:N/SI:N/SA:N/E:X/CR:X/IR:X/AR:X/MAV:X/MAC:X/MAT:X/MPR:X/MUI:X/MVC:X/MVI:X/MVA:X/MSC:X/MSI:X/MSA:X/S:X/AU:X/R:X/V:X/RE:X/U:X', 5.3],
  ['CVE-2024-7450 (NVD)', 'CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N/E:X/CR:X/IR:X/AR:X/MAV:X/MAC:X/MAT:X/MPR:X/MUI:X/MVC:X/MVI:X/MVA:X/MSC:X/MSI:X/MSA:X/S:X/AU:X/R:X/V:X/RE:X/U:X', 8.7],
  ['CVE-2024-7451 (CNA)', 'CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:L/VI:L/VA:L/SC:N/SI:N/SA:N/E:X/CR:X/IR:X/AR:X/MAV:X/MAC:X/MAT:X/MPR:X/MUI:X/MVC:X/MVI:X/MVA:X/MSC:X/MSI:X/MSA:X/S:X/AU:X/R:X/V:X/RE:X/U:X', 5.3],
  ['CVE-2024-7871 (CNA)', 'CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N/E:X/CR:X/IR:X/AR:X/MAV:X/MAC:X/MAT:X/MPR:X/MUI:X/MVC:X/MVI:X/MVA:X/MSC:X/MSI:X/MSA:X/S:X/AU:X/R:X/V:X/RE:X/U:X', 8.7],
  ['CVE-2025-3067 (NVD)', 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:A/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N/E:X/CR:X/IR:X/AR:X/MAV:X/MAC:X/MAT:X/MPR:X/MUI:X/MVC:X/MVI:X/MVA:X/MSC:X/MSI:X/MSA:X/S:X/AU:X/R:X/V:X/RE:X/U:X', 8.6],
];
for (const [name, vector, expected] of PUBLISHED) {
  const parsed = parseVector4(vector);
  if (!parsed) fail(`${name}: could not parse`);
  else if (calculate4(parsed).score !== expected) fail(`${name}: published ${expected}, computed ${calculate4(parsed).score}`);
}

// 2a. Parsing and round trip.
const base = parseVector4('CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N');
if (!base || toVectorString4(base) !== 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N') fail('base vector does not round trip');
for (const bad of ['CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', 'CVSS:4.0/AV:N', 'CVSS:4.0/AV:Z/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N', 'CVSS:4.0/AV:N/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N', 'CVSS:4.0/XX:N/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N']) {
  if (parseVector4(bad)) fail(`accepted a bad vector: ${bad}`);
}

// 2a'. The calculator's starting vector must be valid and score what the page says (9.3).
for (const def of METRICS4) if (!def.values.some((v) => v.code === DEFAULT_METRICS_4[def.key])) fail(`default ${def.key}:${DEFAULT_METRICS_4[def.key]} is not an allowed value`);
if (calculate4(DEFAULT_METRICS_4).score !== 9.3) fail(`default vector should score 9.3, got ${calculate4(DEFAULT_METRICS_4).score}`);

// 2b. A vector with no impact on any system scores 0.
const noImpact = { ...DEFAULT_METRICS_4, VC: 'N', VI: 'N', VA: 'N', SC: 'N', SI: 'N', SA: 'N' };
if (calculate4(noImpact).score !== 0) fail('no-impact vector should score 0');

// Random vectors. Severity order of values, most severe first (the order the reference calculator uses).
const SEVERITY_ORDER: Partial<Record<Metric4Key, string[]>> = {
  AV: ['N', 'A', 'L', 'P'], AC: ['L', 'H'], AT: ['N', 'P'], PR: ['N', 'L', 'H'], UI: ['N', 'P', 'A'],
  VC: ['H', 'L', 'N'], VI: ['H', 'L', 'N'], VA: ['H', 'L', 'N'], SC: ['H', 'L', 'N'], SI: ['H', 'L', 'N'], SA: ['H', 'L', 'N'],
  E: ['A', 'P', 'U'], CR: ['H', 'M', 'L'], IR: ['H', 'M', 'L'], AR: ['H', 'M', 'L'],
};
let seed = 12345;
const random = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];

function randomMetrics(withOptional: boolean): Metrics4 {
  const metrics = { ...DEFAULT_METRICS_4 };
  for (const def of METRICS4) {
    if (def.group === 'supplemental') continue;
    const isBase = BASE_KEYS_4.includes(def.key);
    if (isBase || (withOptional && random() < 0.4)) metrics[def.key] = pick(def.values.map((v) => v.code));
  }
  return metrics;
}

const N = 20000;
for (let i = 0; i < N; i++) {
  const metrics = randomMetrics(i % 2 === 0);
  const result = calculate4(metrics);
  const lookup = CVSS4_LOOKUP[macroVector(metrics)];
  if (lookup === undefined) { fail(`no table entry for macrovector ${macroVector(metrics)}`); continue; }
  // Range, and a score never exceeds its group's table score.
  if (!(result.score >= 0 && result.score <= 10)) fail(`score out of range: ${result.score} for ${toVectorString4(metrics)}`);
  if (result.score > lookup + 1e-9) fail(`score ${result.score} above its group score ${lookup} for ${toVectorString4(metrics)}`);
  // The vector survives a round trip.
  const back = parseVector4(toVectorString4(metrics));
  if (!back || toVectorString4(back) !== toVectorString4(metrics)) fail(`round trip failed for ${toVectorString4(metrics)}`);

  // Monotonic: making one metric strictly less severe never raises the score.
  const keys = Object.keys(SEVERITY_ORDER) as Metric4Key[];
  const key = pick(keys);
  const order = SEVERITY_ORDER[key]!;
  const at = order.indexOf(metrics[key]);
  const effective = at === -1 ? 0 : at; // Not Defined behaves as the most severe value for E and the requirements
  if (effective < order.length - 1 && (BASE_KEYS_4.includes(key) || metrics[key] !== 'X' || key === 'E' || key === 'CR' || key === 'IR' || key === 'AR')) {
    const milder = { ...metrics, [key]: order[effective + 1] };
    const milderScore = calculate4(milder).score;
    if (milderScore > result.score + 1e-9) fail(`less severe ${key} raised the score: ${result.score} -> ${milderScore} for ${toVectorString4(metrics)}`);
  }
}

// 2c. The most severe vectors of every group, built from the reference data, score exactly the table value.
// (The same highest-severity vectors the scoring code measures distance from.)
const TOP = {
  eq1: [['AV:N/PR:N/UI:N/'], ['AV:A/PR:N/UI:N/', 'AV:N/PR:L/UI:N/', 'AV:N/PR:N/UI:P/'], ['AV:P/PR:N/UI:N/', 'AV:A/PR:L/UI:P/']],
  eq2: [['AC:L/AT:N/'], ['AC:H/AT:N/', 'AC:L/AT:P/']],
  eq3: [
    [['VC:H/VI:H/VA:H/CR:H/IR:H/AR:H/'], ['VC:H/VI:H/VA:L/CR:M/IR:M/AR:H/', 'VC:H/VI:H/VA:H/CR:M/IR:M/AR:M/']],
    [['VC:L/VI:H/VA:H/CR:H/IR:H/AR:H/', 'VC:H/VI:L/VA:H/CR:H/IR:H/AR:H/'], ['VC:L/VI:H/VA:L/CR:H/IR:M/AR:H/', 'VC:L/VI:H/VA:H/CR:H/IR:M/AR:M/', 'VC:H/VI:L/VA:H/CR:M/IR:H/AR:M/', 'VC:H/VI:L/VA:L/CR:M/IR:H/AR:H/', 'VC:L/VI:L/VA:H/CR:H/IR:H/AR:M/']],
    [[], ['VC:L/VI:L/VA:L/CR:H/IR:H/AR:H/']],
  ],
  eq4: [['SC:H/SI:S/SA:S/'], ['SC:H/SI:H/SA:H/'], ['SC:L/SI:L/SA:L/']],
  eq5: [['E:A/'], ['E:P/'], ['E:U/']],
};
function fromParts(parts: string[]): Metrics4 {
  const metrics = { ...DEFAULT_METRICS_4, SC: 'N', SI: 'N', SA: 'N' } as Metrics4;
  for (const part of parts.join('').split('/').filter(Boolean)) {
    const [key, value] = part.split(':') as [Metric4Key, string];
    // "SI:S" and "SA:S" in the reference data mean the Safety value of the Modified metrics.
    if ((key === 'SI' || key === 'SA') && value === 'S') {
      metrics[key === 'SI' ? 'MSI' : 'MSA'] = 'S';
      metrics[key] = 'H';
    } else metrics[key] = value;
  }
  return metrics;
}
let topChecks = 0;
for (const eq1 of TOP.eq1) for (const eq2 of TOP.eq2) for (const eq4 of TOP.eq4) for (const eq5 of TOP.eq5) {
  for (const eq3Row of TOP.eq3) for (const eq6List of eq3Row) for (const eq3Top of eq6List) for (const a of eq1) for (const b of eq2) for (const d of eq4) for (const e of eq5) {
    const metrics = fromParts([a, b, eq3Top, d, e]);
    const macro = macroVector(metrics);
    const table = CVSS4_LOOKUP[macro];
    const got = calculate4(metrics).score;
    topChecks++;
    if (table === undefined || Math.abs(got - table) > 1e-9) fail(`group ${macro}: its most severe vector ${toVectorString4(metrics)} scored ${got}, table says ${table}`);
  }
}

// 2d. Environmental metrics (no published CVE score uses them, so these are properties, not published values).
const MODIFIED_OF: Partial<Record<Metric4Key, Metric4Key>> = { MAV: 'AV', MAC: 'AC', MAT: 'AT', MPR: 'PR', MUI: 'UI', MVC: 'VC', MVI: 'VI', MVA: 'VA', MSC: 'SC', MSI: 'SI', MSA: 'SA' };
let envChecks = 0;
for (let i = 0; i < 3000; i++) {
  const metrics = randomMetrics(false);
  const score = calculate4(metrics).score;
  // A Modified metric set to the base metric's own value changes nothing.
  for (const [modifiedKey, baseKey] of Object.entries(MODIFIED_OF) as [Metric4Key, Metric4Key][]) {
    const same = { ...metrics, [modifiedKey]: metrics[baseKey] };
    envChecks++;
    if (calculate4(same).score !== score) fail(`${modifiedKey}=${metrics[baseKey]} (same as ${baseKey}) changed the score ${score} -> ${calculate4(same).score} for ${toVectorString4(metrics)}`);
  }
  // The three requirements default to High when Not Defined.
  const high = { ...metrics, CR: 'H', IR: 'H', AR: 'H' };
  envChecks++;
  if (calculate4(high).score !== score) fail(`CR/IR/AR set to High changed the score ${score} -> ${calculate4(high).score} for ${toVectorString4(metrics)}`);
  // Exploit Maturity Not Defined behaves as Attacked.
  const attacked = { ...metrics, E: 'A' };
  envChecks++;
  if (calculate4(attacked).score !== score) fail(`E:A differs from E:X: ${score} vs ${calculate4(attacked).score} for ${toVectorString4(metrics)}`);
}

console.log(`Checked ${PUBLISHED.length} published scores, ${N} random vectors and ${topChecks} most-severe-vector cases and ${envChecks} environmental property checks: ${failures} failures.`);
process.exit(failures ? 1 : 0);
