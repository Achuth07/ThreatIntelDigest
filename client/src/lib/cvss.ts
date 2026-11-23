/**
 * CVSS v3.0 / v3.1 base score maths and metric definitions (WHA-29).
 *
 * Pure functions, shared by the calculator page and its server-rendered copy, so the page, the
 * explanation and the worked examples can never disagree. The formulas are the ones in the FIRST
 * CVSS v3.1 specification; scripts/check-cvss.ts checks them against the scores NVD stores.
 * Keep this file free of React and browser APIs, the server uses it too.
 */

export type MetricKey = 'AV' | 'AC' | 'PR' | 'UI' | 'S' | 'C' | 'I' | 'A';
export type Metrics = Record<MetricKey, string>;
export type CvssVersion = '3.0' | '3.1';

export interface MetricValue {
  code: string;
  label: string;
  /** One plain sentence on what choosing this value means. */
  description: string;
}

export interface MetricDef {
  key: MetricKey;
  name: string;
  /** The question the metric answers. */
  question: string;
  values: MetricValue[];
}

export const METRICS: MetricDef[] = [
  {
    key: 'AV',
    name: 'Attack Vector',
    question: 'How close does the attacker need to be to the vulnerable system?',
    values: [
      { code: 'N', label: 'Network', description: 'The flaw can be exploited remotely over the network, from anywhere on the internet.' },
      { code: 'A', label: 'Adjacent', description: 'The attacker must be on the same shared network, such as the same Wi-Fi, subnet or Bluetooth range.' },
      { code: 'L', label: 'Local', description: 'The attacker needs local access to the system, or must trick a user into opening a malicious file.' },
      { code: 'P', label: 'Physical', description: 'The attacker must physically touch or manipulate the device.' },
    ],
  },
  {
    key: 'AC',
    name: 'Attack Complexity',
    question: 'Does exploitation depend on conditions the attacker cannot control?',
    values: [
      { code: 'L', label: 'Low', description: 'No special conditions: the attack can be repeated reliably against the vulnerable component.' },
      { code: 'H', label: 'High', description: 'The attacker needs a specific configuration, a race condition or other preparation to succeed.' },
    ],
  },
  {
    key: 'PR',
    name: 'Privileges Required',
    question: 'What level of access does the attacker need before the attack?',
    values: [
      { code: 'N', label: 'None', description: 'The attacker needs no account or access.' },
      { code: 'L', label: 'Low', description: 'The attacker needs basic user privileges.' },
      { code: 'H', label: 'High', description: 'The attacker needs administrative or other significant privileges.' },
    ],
  },
  {
    key: 'UI',
    name: 'User Interaction',
    question: 'Must a person other than the attacker do something for the attack to work?',
    values: [
      { code: 'N', label: 'None', description: 'The attack works without any action from a user.' },
      { code: 'R', label: 'Required', description: 'A user must act first, for example by clicking a link or opening a file.' },
    ],
  },
  {
    key: 'S',
    name: 'Scope',
    question: 'Can the attack reach beyond the vulnerable component?',
    values: [
      { code: 'U', label: 'Unchanged', description: 'The impact stays within the vulnerable component\'s own security boundary.' },
      { code: 'C', label: 'Changed', description: 'The attack affects other components, for example escaping a sandbox or a virtual machine.' },
    ],
  },
  {
    key: 'C',
    name: 'Confidentiality',
    question: 'How much information can the attacker read?',
    values: [
      { code: 'N', label: 'None', description: 'No information is exposed.' },
      { code: 'L', label: 'Low', description: 'Some information is exposed, but the attacker does not control what.' },
      { code: 'H', label: 'High', description: 'All information in the component is exposed, or the exposed data is critical.' },
    ],
  },
  {
    key: 'I',
    name: 'Integrity',
    question: 'How much can the attacker change?',
    values: [
      { code: 'N', label: 'None', description: 'Nothing can be modified.' },
      { code: 'L', label: 'Low', description: 'Some data can be modified, but the attacker does not control what.' },
      { code: 'H', label: 'High', description: 'The attacker can modify any data, or the changes have a serious consequence.' },
    ],
  },
  {
    key: 'A',
    name: 'Availability',
    question: 'How much can the attacker disrupt the service?',
    values: [
      { code: 'N', label: 'None', description: 'There is no effect on availability.' },
      { code: 'L', label: 'Low', description: 'Performance drops or the service is interrupted now and then.' },
      { code: 'H', label: 'High', description: 'The attacker can fully deny access to the component, in a lasting way.' },
    ],
  },
];

const METRIC_ORDER: MetricKey[] = ['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A'];

/** The calculator's starting point: the common unauthenticated remote worst case, score 9.8. */
export const DEFAULT_METRICS: Metrics = { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'H', I: 'H', A: 'H' };

const WEIGHTS = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
  AC: { L: 0.77, H: 0.44 },
  UI: { N: 0.85, R: 0.62 },
  CIA: { H: 0.56, L: 0.22, N: 0 },
  // Privileges Required depends on Scope.
  PR_UNCHANGED: { N: 0.85, L: 0.62, H: 0.27 },
  PR_CHANGED: { N: 0.85, L: 0.68, H: 0.5 },
} as const;

export type Severity = 'None' | 'Low' | 'Medium' | 'High' | 'Critical';

export const SEVERITY_RANGES: { severity: Severity; range: string; min: number; max: number }[] = [
  { severity: 'None', range: '0.0', min: 0, max: 0 },
  { severity: 'Low', range: '0.1 to 3.9', min: 0.1, max: 3.9 },
  { severity: 'Medium', range: '4.0 to 6.9', min: 4, max: 6.9 },
  { severity: 'High', range: '7.0 to 8.9', min: 7, max: 8.9 },
  { severity: 'Critical', range: '9.0 to 10.0', min: 9, max: 10 },
];

export function severityOf(score: number): Severity {
  if (score <= 0) return 'None';
  if (score < 4) return 'Low';
  if (score < 7) return 'Medium';
  if (score < 9) return 'High';
  return 'Critical';
}

/** Round up to one decimal. 3.1 guards against floating point error; 3.0 used a plain ceiling. */
function roundUp(value: number, version: CvssVersion): number {
  if (version === '3.0') return Math.ceil(value * 10) / 10;
  const int = Math.round(value * 100000);
  return int % 10000 === 0 ? int / 100000 : (Math.floor(int / 10000) + 1) / 10;
}

export interface CvssResult {
  base: number;
  impact: number;
  exploitability: number;
  severity: Severity;
}

export function calculate(metrics: Metrics, version: CvssVersion = '3.1'): CvssResult {
  const changed = metrics.S === 'C';
  const iss = 1 - (1 - WEIGHTS.CIA[metrics.C as 'H']) * (1 - WEIGHTS.CIA[metrics.I as 'H']) * (1 - WEIGHTS.CIA[metrics.A as 'H']);
  const impact = changed ? 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15) : 6.42 * iss;
  const pr = (changed ? WEIGHTS.PR_CHANGED : WEIGHTS.PR_UNCHANGED)[metrics.PR as 'N'];
  const exploitability = 8.22 * WEIGHTS.AV[metrics.AV as 'N'] * WEIGHTS.AC[metrics.AC as 'L'] * pr * WEIGHTS.UI[metrics.UI as 'N'];

  let base = 0;
  if (impact > 0) base = changed ? roundUp(Math.min(1.08 * (impact + exploitability), 10), version) : roundUp(Math.min(impact + exploitability, 10), version);

  return {
    base,
    // The specification shows these two rounded to one decimal.
    impact: Math.round(Math.max(impact, 0) * 10) / 10,
    exploitability: Math.round(exploitability * 10) / 10,
    severity: severityOf(base),
  };
}

export const toVectorString = (metrics: Metrics, version: CvssVersion = '3.1') =>
  `CVSS:${version}/${METRIC_ORDER.map((key) => `${key}:${metrics[key]}`).join('/')}`;

/**
 * Reads a CVSS v3 base vector such as "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H". Any metric may come
 * in any order. Returns null for anything that is not a complete, valid base vector (temporal and
 * environmental metrics are ignored).
 */
export function parseVector(text: string): { version: CvssVersion; metrics: Metrics } | null {
  const parts = text.trim().split('/');
  const head = parts.shift()?.match(/^CVSS:(3\.[01])$/i);
  if (!head) return null;

  const found: Partial<Metrics> = {};
  for (const part of parts) {
    const [key, value] = part.split(':');
    const def = METRICS.find((m) => m.key === key?.toUpperCase());
    if (!def) continue; // E:, RL:, RC:, CR: and so on
    if (!def.values.some((v) => v.code === value?.toUpperCase())) return null;
    found[def.key] = value.toUpperCase();
  }
  if (METRIC_ORDER.some((key) => !found[key])) return null;
  return { version: head[1] as CvssVersion, metrics: found as Metrics };
}

/** Label of a metric value, for example ("AV", "N") -> "Network". */
export function labelOf(key: MetricKey, code: string): string {
  return METRICS.find((m) => m.key === key)?.values.find((v) => v.code === code)?.label ?? code;
}

/** Worked examples shown on the page: real flaws and what their vectors score. */
export const EXAMPLES: { cveId: string; name: string; vector: string }[] = [
  { cveId: 'CVE-2021-44228', name: 'Log4Shell, remote code execution in Apache Log4j', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H' },
  { cveId: 'CVE-2024-3400', name: 'PAN-OS GlobalProtect command injection', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H' },
  { cveId: 'CVE-2023-34362', name: 'MOVEit Transfer SQL injection', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' },
];
