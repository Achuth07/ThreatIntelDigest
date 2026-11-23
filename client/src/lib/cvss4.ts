/**
 * CVSS v4.0 metrics, vector parsing and scoring (WHA-29).
 *
 * The scoring is a TypeScript port of the FIRST reference calculator
 * (https://github.com/FIRSTdotorg/cvss-v4-calculator): Copyright (c) 2023 FIRST.ORG, Inc., Red Hat, and
 * contributors, BSD-2-Clause. v4.0 does not use a formula like v3.x. A vector is put into one of 270
 * groups of equivalent vectors (a "macrovector"), each group has a score (cvss4-lookup.ts), and the
 * vector's distance from the most severe vector in its group moves the score down inside the group.
 * scripts/check-cvss4.ts checks this port against the v4.0 scores NVD publishes.
 * Keep this file free of React and browser APIs, the server uses it too.
 */

import { CVSS4_LOOKUP } from './cvss4-lookup';
import { severityOf, type Severity } from './cvss';

export type Metric4Key =
  | 'AV' | 'AC' | 'AT' | 'PR' | 'UI' | 'VC' | 'VI' | 'VA' | 'SC' | 'SI' | 'SA'
  | 'E'
  | 'CR' | 'IR' | 'AR' | 'MAV' | 'MAC' | 'MAT' | 'MPR' | 'MUI' | 'MVC' | 'MVI' | 'MVA' | 'MSC' | 'MSI' | 'MSA'
  | 'S' | 'AU' | 'R' | 'V' | 'RE' | 'U';

/** Every metric has a value; "X" means Not Defined. */
export type Metrics4 = Record<Metric4Key, string>;

export type Group4 = 'base' | 'threat' | 'environmental' | 'supplemental';

export interface Value4 {
  code: string;
  label: string;
  description: string;
}

export interface Metric4Def {
  key: Metric4Key;
  name: string;
  group: Group4;
  /** Heading inside the group, for the base metrics. */
  subgroup?: string;
  question: string;
  values: Value4[];
}

const NOT_DEFINED: Value4 = { code: 'X', label: 'Not Defined', description: 'Not set. The default is used.' };

/** The base metric values, reused by the Modified Base metrics (which add Not Defined). */
const BASE_VALUES: Record<string, Value4[]> = {
  AV: [
    { code: 'N', label: 'Network', description: 'The flaw can be exploited remotely over the network, including from the internet.' },
    { code: 'A', label: 'Adjacent', description: 'The attacker must be on the same shared or limited network, such as the same subnet or Bluetooth range.' },
    { code: 'L', label: 'Local', description: 'The attacker needs local access to the system, or must get a local user to run something.' },
    { code: 'P', label: 'Physical', description: 'The attacker must physically touch or manipulate the device.' },
  ],
  AC: [
    { code: 'L', label: 'Low', description: 'No built-in security measures stand in the attacker\'s way.' },
    { code: 'H', label: 'High', description: 'The attacker must get around built-in security measures, such as exploit mitigations, to succeed.' },
  ],
  AT: [
    { code: 'N', label: 'None', description: 'The attack works whatever the deployment and execution conditions of the target.' },
    { code: 'P', label: 'Present', description: 'The attack needs particular conditions in the target, such as a race, a specific configuration or an on-path position.' },
  ],
  PR: [
    { code: 'N', label: 'None', description: 'The attacker needs no account or access.' },
    { code: 'L', label: 'Low', description: 'The attacker needs basic user privileges.' },
    { code: 'H', label: 'High', description: 'The attacker needs administrative or other significant privileges.' },
  ],
  UI: [
    { code: 'N', label: 'None', description: 'No user needs to do anything for the attack to work.' },
    { code: 'P', label: 'Passive', description: 'A user takes a limited, ordinary action, such as visiting a page or opening a file.' },
    { code: 'A', label: 'Active', description: 'A user must knowingly do something specific, such as run a command or install an add-on.' },
  ],
};

const impact = (what: string, system: string): Value4[] => [
  { code: 'H', label: 'High', description: `Total loss of ${what} in the ${system}, or the loss has a serious consequence.` },
  { code: 'L', label: 'Low', description: `Some loss of ${what} in the ${system}, but the attacker does not control what.` },
  { code: 'N', label: 'None', description: `No loss of ${what} in the ${system}.` },
];

const safetyImpact = (what: string): Value4[] => [
  { code: 'S', label: 'Safety', description: `A loss of ${what} in the subsequent systems could endanger human safety.` },
  ...impact(what, 'subsequent systems'),
];

const requirement = (what: string): Value4[] => [
  { code: 'H', label: 'High', description: `Losing ${what} would have a catastrophic effect on your organisation.` },
  { code: 'M', label: 'Medium', description: `Losing ${what} would have a serious effect on your organisation.` },
  { code: 'L', label: 'Low', description: `Losing ${what} would have a limited effect on your organisation.` },
];

const modified = (key: string): Value4[] => [NOT_DEFINED, ...BASE_VALUES[key]];

export const METRICS4: Metric4Def[] = [
  // Base: exploitability
  { key: 'AV', name: 'Attack Vector', group: 'base', subgroup: 'Exploitability', question: 'How close does the attacker need to be to the vulnerable system?', values: BASE_VALUES.AV },
  { key: 'AC', name: 'Attack Complexity', group: 'base', subgroup: 'Exploitability', question: 'Must the attacker get around security measures that are built into the system?', values: BASE_VALUES.AC },
  { key: 'AT', name: 'Attack Requirements', group: 'base', subgroup: 'Exploitability', question: 'Does the attack depend on conditions that exist in the target?', values: BASE_VALUES.AT },
  { key: 'PR', name: 'Privileges Required', group: 'base', subgroup: 'Exploitability', question: 'What level of access does the attacker need before the attack?', values: BASE_VALUES.PR },
  { key: 'UI', name: 'User Interaction', group: 'base', subgroup: 'Exploitability', question: 'Must a person other than the attacker do something?', values: BASE_VALUES.UI },
  // Base: impact on the vulnerable system
  { key: 'VC', name: 'Confidentiality', group: 'base', subgroup: 'Vulnerable system impact', question: 'How much information in the vulnerable system can the attacker read?', values: impact('confidentiality', 'vulnerable system') },
  { key: 'VI', name: 'Integrity', group: 'base', subgroup: 'Vulnerable system impact', question: 'How much in the vulnerable system can the attacker change?', values: impact('integrity', 'vulnerable system') },
  { key: 'VA', name: 'Availability', group: 'base', subgroup: 'Vulnerable system impact', question: 'How much can the attacker disrupt the vulnerable system?', values: impact('availability', 'vulnerable system') },
  // Base: impact on subsequent systems
  { key: 'SC', name: 'Confidentiality', group: 'base', subgroup: 'Subsequent system impact', question: 'How much information in other systems can the attacker read after exploiting the flaw?', values: impact('confidentiality', 'subsequent systems') },
  { key: 'SI', name: 'Integrity', group: 'base', subgroup: 'Subsequent system impact', question: 'How much in other systems can the attacker change?', values: impact('integrity', 'subsequent systems') },
  { key: 'SA', name: 'Availability', group: 'base', subgroup: 'Subsequent system impact', question: 'How much can the attacker disrupt other systems?', values: impact('availability', 'subsequent systems') },
  // Threat
  {
    key: 'E',
    name: 'Exploit Maturity',
    group: 'threat',
    question: 'How likely is the flaw to be attacked, based on what is known today?',
    values: [
      NOT_DEFINED,
      { code: 'A', label: 'Attacked', description: 'There are reports of the flaw being attacked, or exploit tools are widely available.' },
      { code: 'P', label: 'Proof-of-Concept', description: 'Proof-of-concept exploit code is public, but there are no reports of real attacks.' },
      { code: 'U', label: 'Unreported', description: 'No attacks and no public proof-of-concept are known.' },
    ],
  },
  // Environmental: security requirements
  { key: 'CR', name: 'Confidentiality Requirement', group: 'environmental', subgroup: 'Security requirements', question: 'How much does your organisation depend on keeping the affected data confidential?', values: [NOT_DEFINED, ...requirement('confidentiality')] },
  { key: 'IR', name: 'Integrity Requirement', group: 'environmental', subgroup: 'Security requirements', question: 'How much does your organisation depend on the affected data staying correct?', values: [NOT_DEFINED, ...requirement('integrity')] },
  { key: 'AR', name: 'Availability Requirement', group: 'environmental', subgroup: 'Security requirements', question: 'How much does your organisation depend on the affected system staying available?', values: [NOT_DEFINED, ...requirement('availability')] },
  // Environmental: modified base metrics
  ...(
    [
      ['MAV', 'Attack Vector', 'AV'],
      ['MAC', 'Attack Complexity', 'AC'],
      ['MAT', 'Attack Requirements', 'AT'],
      ['MPR', 'Privileges Required', 'PR'],
      ['MUI', 'User Interaction', 'UI'],
    ] as const
  ).map(
    ([key, name, base]): Metric4Def => ({
      key,
      name: `Modified ${name}`,
      group: 'environmental',
      subgroup: 'Modified base metrics',
      question: `Does your environment change the ${name.toLowerCase()} of this flaw?`,
      values: modified(base),
    })
  ),
  { key: 'MVC', name: 'Modified Confidentiality (vulnerable system)', group: 'environmental', subgroup: 'Modified base metrics', question: 'Does your environment change the confidentiality impact on the vulnerable system?', values: [NOT_DEFINED, ...impact('confidentiality', 'vulnerable system')] },
  { key: 'MVI', name: 'Modified Integrity (vulnerable system)', group: 'environmental', subgroup: 'Modified base metrics', question: 'Does your environment change the integrity impact on the vulnerable system?', values: [NOT_DEFINED, ...impact('integrity', 'vulnerable system')] },
  { key: 'MVA', name: 'Modified Availability (vulnerable system)', group: 'environmental', subgroup: 'Modified base metrics', question: 'Does your environment change the availability impact on the vulnerable system?', values: [NOT_DEFINED, ...impact('availability', 'vulnerable system')] },
  { key: 'MSC', name: 'Modified Confidentiality (subsequent systems)', group: 'environmental', subgroup: 'Modified base metrics', question: 'Does your environment change the confidentiality impact on subsequent systems?', values: [NOT_DEFINED, ...impact('confidentiality', 'subsequent systems')] },
  { key: 'MSI', name: 'Modified Integrity (subsequent systems)', group: 'environmental', subgroup: 'Modified base metrics', question: 'Does your environment change the integrity impact on subsequent systems?', values: [NOT_DEFINED, ...safetyImpact('integrity')] },
  { key: 'MSA', name: 'Modified Availability (subsequent systems)', group: 'environmental', subgroup: 'Modified base metrics', question: 'Does your environment change the availability impact on subsequent systems?', values: [NOT_DEFINED, ...safetyImpact('availability')] },
  // Supplemental: these do not change the score
  { key: 'S', name: 'Safety', group: 'supplemental', question: 'Could exploiting the flaw affect human safety?', values: [NOT_DEFINED, { code: 'N', label: 'Negligible', description: 'Consequences are negligible.' }, { code: 'P', label: 'Present', description: 'Consequences to safety are possible, ranging from minor injury to loss of life.' }] },
  { key: 'AU', name: 'Automatable', group: 'supplemental', question: 'Can an attacker automate exploiting the flaw across many targets?', values: [NOT_DEFINED, { code: 'N', label: 'No', description: 'The steps cannot be reliably automated.' }, { code: 'Y', label: 'Yes', description: 'The steps can be reliably automated across many targets.' }] },
  { key: 'R', name: 'Recovery', group: 'supplemental', question: 'Can the system recover after an attack?', values: [NOT_DEFINED, { code: 'A', label: 'Automatic', description: 'The system recovers by itself.' }, { code: 'U', label: 'User', description: 'A user has to intervene to recover.' }, { code: 'I', label: 'Irrecoverable', description: 'The system cannot recover.' }] },
  { key: 'V', name: 'Value Density', group: 'supplemental', question: 'How much is there to gain from one successful attack?', values: [NOT_DEFINED, { code: 'D', label: 'Diffuse', description: 'The system holds few resources for the attacker.' }, { code: 'C', label: 'Concentrated', description: 'The system holds many resources, so it is a rich target.' }] },
  { key: 'RE', name: 'Vulnerability Response Effort', group: 'supplemental', question: 'How hard is it to respond to the flaw?', values: [NOT_DEFINED, { code: 'L', label: 'Low', description: 'Responding is easy, for example by installing a patch.' }, { code: 'M', label: 'Moderate', description: 'Responding takes some effort or downtime.' }, { code: 'H', label: 'High', description: 'Responding is hard or disruptive.' }] },
  { key: 'U', name: 'Provider Urgency', group: 'supplemental', question: 'How urgent does the supplier say the fix is?', values: [NOT_DEFINED, { code: 'Clear', label: 'Clear', description: 'The supplier rates it Clear (the lowest urgency).' }, { code: 'Green', label: 'Green', description: 'The supplier rates it Green.' }, { code: 'Amber', label: 'Amber', description: 'The supplier rates it Amber.' }, { code: 'Red', label: 'Red', description: 'The supplier rates it Red (the highest urgency).' }] },
];

/** The order metrics appear in a vector string (base, threat, environmental, supplemental). */
const ORDER: Metric4Key[] = METRICS4.map((m) => m.key);
export const BASE_KEYS_4: Metric4Key[] = METRICS4.filter((m) => m.group === 'base').map((m) => m.key);

/** The calculator's starting point: an unauthenticated remote flaw with full impact on the vulnerable system (9.3). */
export const DEFAULT_METRICS_4: Metrics4 = {
  ...(Object.fromEntries(ORDER.map((key) => [key, 'X'])) as Metrics4),
  AV: 'N', AC: 'L', AT: 'N', PR: 'N', UI: 'N',
  VC: 'H', VI: 'H', VA: 'H',
  SC: 'N', SI: 'N', SA: 'N',
};

// ---------------------------------------------------------------------------------------------
// Vector strings

export function toVectorString4(metrics: Metrics4): string {
  const parts = ORDER.filter((key) => BASE_KEYS_4.includes(key) || metrics[key] !== 'X').map((key) => `${key}:${metrics[key]}`);
  return `CVSS:4.0/${parts.join('/')}`;
}

/**
 * Reads a CVSS v4.0 vector such as "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N".
 * The eleven base metrics are required; the others default to Not Defined. Returns null for anything
 * else: another version, a missing base metric, an unknown metric or an invalid value.
 */
export function parseVector4(text: string): Metrics4 | null {
  const parts = text.trim().split('/');
  if (parts.shift()?.toUpperCase() !== 'CVSS:4.0') return null;

  const metrics = { ...Object.fromEntries(ORDER.map((key) => [key, 'X'])) } as Metrics4;
  const seen = new Set<string>();
  for (const part of parts) {
    const [key, value] = part.split(':');
    const def = METRICS4.find((m) => m.key === key);
    if (!def || seen.has(key) || !def.values.some((v) => v.code === value)) return null;
    seen.add(key);
    metrics[def.key] = value;
  }
  return BASE_KEYS_4.every((key) => seen.has(key)) ? metrics : null;
}

export const labelOf4 = (key: Metric4Key, code: string): string => METRICS4.find((m) => m.key === key)?.values.find((v) => v.code === code)?.label ?? code;

// ---------------------------------------------------------------------------------------------
// Scoring (port of the FIRST reference calculator)

const AV_LEVELS: Record<string, number> = { N: 0.0, A: 0.1, L: 0.2, P: 0.3 };
const PR_LEVELS: Record<string, number> = { N: 0.0, L: 0.1, H: 0.2 };
const UI_LEVELS: Record<string, number> = { N: 0.0, P: 0.1, A: 0.2 };
const AC_LEVELS: Record<string, number> = { L: 0.0, H: 0.1 };
const AT_LEVELS: Record<string, number> = { N: 0.0, P: 0.1 };
const IMPACT_LEVELS: Record<string, number> = { H: 0.0, L: 0.1, N: 0.2 };
const SC_LEVELS: Record<string, number> = { H: 0.1, L: 0.2, N: 0.3 };
const SIA_LEVELS: Record<string, number> = { S: 0.0, H: 0.1, L: 0.2, N: 0.3 };
const REQ_LEVELS: Record<string, number> = { H: 0.0, M: 0.1, L: 0.2 };

/** Highest-severity vectors of each equivalence class (from the reference calculator). */
const MAX_COMPOSED = {
  eq1: { 0: ['AV:N/PR:N/UI:N/'], 1: ['AV:A/PR:N/UI:N/', 'AV:N/PR:L/UI:N/', 'AV:N/PR:N/UI:P/'], 2: ['AV:P/PR:N/UI:N/', 'AV:A/PR:L/UI:P/'] },
  eq2: { 0: ['AC:L/AT:N/'], 1: ['AC:H/AT:N/', 'AC:L/AT:P/'] },
  eq3: {
    0: { 0: ['VC:H/VI:H/VA:H/CR:H/IR:H/AR:H/'], 1: ['VC:H/VI:H/VA:L/CR:M/IR:M/AR:H/', 'VC:H/VI:H/VA:H/CR:M/IR:M/AR:M/'] },
    1: {
      0: ['VC:L/VI:H/VA:H/CR:H/IR:H/AR:H/', 'VC:H/VI:L/VA:H/CR:H/IR:H/AR:H/'],
      1: ['VC:L/VI:H/VA:L/CR:H/IR:M/AR:H/', 'VC:L/VI:H/VA:H/CR:H/IR:M/AR:M/', 'VC:H/VI:L/VA:H/CR:M/IR:H/AR:M/', 'VC:H/VI:L/VA:L/CR:M/IR:H/AR:H/', 'VC:L/VI:L/VA:H/CR:H/IR:H/AR:M/'],
    },
    2: { 1: ['VC:L/VI:L/VA:L/CR:H/IR:H/AR:H/'] },
  },
  eq4: { 0: ['SC:H/SI:S/SA:S/'], 1: ['SC:H/SI:H/SA:H/'], 2: ['SC:L/SI:L/SA:L/'] },
  eq5: { 0: ['E:A/'], 1: ['E:P/'], 2: ['E:U/'] },
} as const;

/** Largest severity distance (in steps of 0.1) inside each equivalence class. */
const MAX_SEVERITY = {
  eq1: { 0: 1, 1: 4, 2: 5 },
  eq2: { 0: 1, 1: 2 },
  eq3eq6: { 0: { 0: 7, 1: 6 }, 1: { 0: 8, 1: 8 }, 2: { 1: 10 } },
  eq4: { 0: 6, 1: 5, 2: 4 },
  eq5: { 0: 1, 1: 1, 2: 1 },
} as const;

/**
 * A metric's effective value: Not Defined falls back to the worst case for E and the three
 * requirements, and a defined Modified metric overrides the base metric.
 */
function m(metrics: Metrics4, metric: string): string {
  const selected = (metrics as Record<string, string>)[metric];
  if (metric === 'E' && selected === 'X') return 'A';
  if ((metric === 'CR' || metric === 'IR' || metric === 'AR') && selected === 'X') return 'H';
  const override = (metrics as Record<string, string>)[`M${metric}`];
  if (override !== undefined && override !== 'X') return override;
  return selected;
}

/** The six equivalence-class digits of a vector. */
export function macroVector(metrics: Metrics4): string {
  const av = m(metrics, 'AV'), pr = m(metrics, 'PR'), ui = m(metrics, 'UI');
  let eq1: number;
  if (av === 'N' && pr === 'N' && ui === 'N') eq1 = 0;
  else if ((av === 'N' || pr === 'N' || ui === 'N') && av !== 'P') eq1 = 1;
  else eq1 = 2;

  const eq2 = m(metrics, 'AC') === 'L' && m(metrics, 'AT') === 'N' ? 0 : 1;

  const vc = m(metrics, 'VC'), vi = m(metrics, 'VI'), va = m(metrics, 'VA');
  let eq3: number;
  if (vc === 'H' && vi === 'H') eq3 = 0;
  else if (vc === 'H' || vi === 'H' || va === 'H') eq3 = 1;
  else eq3 = 2;

  const safety = m(metrics, 'MSI') === 'S' || m(metrics, 'MSA') === 'S';
  let eq4: number;
  if (safety) eq4 = 0;
  else if (m(metrics, 'SC') === 'H' || m(metrics, 'SI') === 'H' || m(metrics, 'SA') === 'H') eq4 = 1;
  else eq4 = 2;

  const e = m(metrics, 'E');
  const eq5 = e === 'A' ? 0 : e === 'P' ? 1 : 2;

  const eq6 =
    (m(metrics, 'CR') === 'H' && vc === 'H') || (m(metrics, 'IR') === 'H' && vi === 'H') || (m(metrics, 'AR') === 'H' && va === 'H') ? 0 : 1;

  return `${eq1}${eq2}${eq3}${eq4}${eq5}${eq6}`;
}

function parseMax(vector: string): Record<string, string> {
  return Object.fromEntries(
    vector
      .split('/')
      .filter(Boolean)
      .map((part) => part.split(':') as [string, string])
  );
}

function scoreOf(metrics: Metrics4, macro: string): number {
  if (['VC', 'VI', 'VA', 'SC', 'SI', 'SA'].every((metric) => m(metrics, metric) === 'N')) return 0;

  let value = CVSS4_LOOKUP[macro];
  const [eq1, eq2, eq3, eq4, eq5, eq6] = macro.split('').map(Number);
  const key = (a: number, b: number, c: number, d: number, e: number, f: number) => `${a}${b}${c}${d}${e}${f}`;
  const lookup = (k: string): number => CVSS4_LOOKUP[k] ?? NaN;

  // The score of the next lower group in each equivalence class (NaN when there is none).
  const scoreEq1 = lookup(key(eq1 + 1, eq2, eq3, eq4, eq5, eq6));
  const scoreEq2 = lookup(key(eq1, eq2 + 1, eq3, eq4, eq5, eq6));
  let scoreEq3Eq6: number;
  if (eq3 === 1 && eq6 === 1) scoreEq3Eq6 = lookup(key(eq1, eq2, eq3 + 1, eq4, eq5, eq6));
  else if (eq3 === 0 && eq6 === 1) scoreEq3Eq6 = lookup(key(eq1, eq2, eq3 + 1, eq4, eq5, eq6));
  else if (eq3 === 1 && eq6 === 0) scoreEq3Eq6 = lookup(key(eq1, eq2, eq3, eq4, eq5, eq6 + 1));
  else if (eq3 === 0 && eq6 === 0) {
    const left = lookup(key(eq1, eq2, eq3, eq4, eq5, eq6 + 1));
    const right = lookup(key(eq1, eq2, eq3 + 1, eq4, eq5, eq6));
    scoreEq3Eq6 = left > right ? left : right;
  } else scoreEq3Eq6 = lookup(key(eq1, eq2, eq3 + 1, eq4, eq5, eq6 + 1));
  const scoreEq4 = lookup(key(eq1, eq2, eq3, eq4 + 1, eq5, eq6));
  const scoreEq5 = lookup(key(eq1, eq2, eq3, eq4, eq5 + 1, eq6));

  // All the highest-severity vectors of this group.
  const maxes: string[] = [];
  for (const a of MAX_COMPOSED.eq1[eq1 as 0]) for (const b of MAX_COMPOSED.eq2[eq2 as 0]) {
    for (const c of (MAX_COMPOSED.eq3[eq3 as 0] as Record<number, readonly string[]>)[eq6]) {
      for (const d of MAX_COMPOSED.eq4[eq4 as 0]) for (const e of MAX_COMPOSED.eq5[eq5 as 0]) maxes.push(a + b + c + d + e);
    }
  }

  // The first highest-severity vector that is at least as severe as this vector on every metric.
  const distance = { AV: 0, PR: 0, UI: 0, AC: 0, AT: 0, VC: 0, VI: 0, VA: 0, SC: 0, SI: 0, SA: 0, CR: 0, IR: 0, AR: 0 };
  for (const max of maxes) {
    const top = parseMax(max);
    distance.AV = AV_LEVELS[m(metrics, 'AV')] - AV_LEVELS[top.AV];
    distance.PR = PR_LEVELS[m(metrics, 'PR')] - PR_LEVELS[top.PR];
    distance.UI = UI_LEVELS[m(metrics, 'UI')] - UI_LEVELS[top.UI];
    distance.AC = AC_LEVELS[m(metrics, 'AC')] - AC_LEVELS[top.AC];
    distance.AT = AT_LEVELS[m(metrics, 'AT')] - AT_LEVELS[top.AT];
    distance.VC = IMPACT_LEVELS[m(metrics, 'VC')] - IMPACT_LEVELS[top.VC];
    distance.VI = IMPACT_LEVELS[m(metrics, 'VI')] - IMPACT_LEVELS[top.VI];
    distance.VA = IMPACT_LEVELS[m(metrics, 'VA')] - IMPACT_LEVELS[top.VA];
    distance.SC = SC_LEVELS[m(metrics, 'SC')] - SC_LEVELS[top.SC];
    distance.SI = SIA_LEVELS[m(metrics, 'SI')] - SIA_LEVELS[top.SI];
    distance.SA = SIA_LEVELS[m(metrics, 'SA')] - SIA_LEVELS[top.SA];
    distance.CR = REQ_LEVELS[m(metrics, 'CR')] - REQ_LEVELS[top.CR];
    distance.IR = REQ_LEVELS[m(metrics, 'IR')] - REQ_LEVELS[top.IR];
    distance.AR = REQ_LEVELS[m(metrics, 'AR')] - REQ_LEVELS[top.AR];
    if (Object.values(distance).some((d) => d < 0)) continue;
    break;
  }

  const currentEq1 = distance.AV + distance.PR + distance.UI;
  const currentEq2 = distance.AC + distance.AT;
  const currentEq3Eq6 = distance.VC + distance.VI + distance.VA + distance.CR + distance.IR + distance.AR;
  const currentEq4 = distance.SC + distance.SI + distance.SA;

  const step = 0.1;
  const maxEq1 = MAX_SEVERITY.eq1[eq1 as 0] * step;
  const maxEq2 = MAX_SEVERITY.eq2[eq2 as 0] * step;
  const maxEq3Eq6 = (MAX_SEVERITY.eq3eq6[eq3 as 0] as Record<number, number>)[eq6] * step;
  const maxEq4 = MAX_SEVERITY.eq4[eq4 as 0] * step;

  let existing = 0;
  let sum = 0;
  const add = (availableNext: number, current: number, max: number) => {
    const available = value - availableNext;
    if (!Number.isNaN(available)) {
      existing++;
      sum += available * (current / max);
    }
  };
  add(scoreEq1, currentEq1, maxEq1);
  add(scoreEq2, currentEq2, maxEq2);
  add(scoreEq3Eq6, currentEq3Eq6, maxEq3Eq6);
  add(scoreEq4, currentEq4, maxEq4);
  // EQ5 always contributes a distance of 0, but it still counts toward the mean when a lower group exists.
  if (!Number.isNaN(value - scoreEq5)) existing++;

  const meanDistance = existing === 0 ? 0 : sum / existing;
  value -= meanDistance;
  if (value < 0) value = 0;
  if (value > 10) value = 10;
  return Math.round(value * 10) / 10;
}

export interface Cvss4Result {
  score: number;
  severity: Severity;
  macrovector: string;
  /** CVSS-B, CVSS-BT, CVSS-BE or CVSS-BTE: which metric groups the score used. */
  label: string;
}

export function calculate4(metrics: Metrics4): Cvss4Result {
  const macro = macroVector(metrics);
  const score = scoreOf(metrics, macro);
  const threat = metrics.E !== 'X';
  const environmental = METRICS4.some((def) => def.group === 'environmental' && metrics[def.key] !== 'X');
  return { score, severity: severityOf(score), macrovector: macro, label: `CVSS-B${threat ? 'T' : ''}${environmental ? 'E' : ''}` };
}

/** Worked examples shown on the page. The scores are computed, not typed in. */
export const EXAMPLES_4: { name: string; vector: string }[] = [
  { name: 'Remote, unauthenticated, full compromise of the vulnerable system', vector: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N' },
  { name: 'The same flaw, with full impact on connected systems too', vector: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H' },
  { name: 'Cross-site scripting that needs a user to act', vector: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:A/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N' },
];
