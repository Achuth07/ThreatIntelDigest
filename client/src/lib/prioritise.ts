/**
 * CVE prioritiser (WHA-29): the pure parts shared by the page and the API. A visitor pastes CVE IDs; each
 * one is placed in a patch-priority tier from three signals: is it in CISA KEV, its EPSS probability, and its
 * CVSS v3 score. The rules are deliberately simple and are printed on the page.
 * Keep this file free of React and browser APIs, the server uses it too.
 */

export const MAX_PRIORITISE_IDS = 200;

const CVE_PATTERN = /CVE-\d{4}-\d{4,}/gi;

/** Every CVE ID in a piece of text, upper-cased, once each, in the order first seen. */
export function extractCveIds(text: string): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const match of text.match(CVE_PATTERN) ?? []) {
    const id = match.toUpperCase();
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/** Cleans ?cve= style values: each may hold one ID or a pasted list. Keeps at most MAX_PRIORITISE_IDS. */
export function parseCveList(values: string[]): { ids: string[]; truncated: boolean } {
  const all = extractCveIds(values.join('\n'));
  return { ids: all.slice(0, MAX_PRIORITISE_IDS), truncated: all.length > MAX_PRIORITISE_IDS };
}

export interface PrioritiseEntry {
  cveId: string;
  /** False when WhatCyber has no record of the ID (not yet published, rejected, or mistyped). */
  found: boolean;
  /** The KEV vendor when listed; empty otherwise. */
  vendors: string[];
  /** KEV vulnerability name, when listed. */
  name: string | null;
  publishedDate: string | null;
  cvssScore: number | null;
  cvssSeverity: string | null;
  epss: number | null;
  epssPercentile: number | null;
  inKev: boolean;
  kevDateAdded: string | null;
  kevDueDate: string | null;
  ransomware: boolean;
}

export type Tier = 'now' | 'soon' | 'plan' | 'routine' | 'unknown';

export interface TierInfo {
  tier: Tier;
  /** Short label for the badge. */
  label: string;
  /** One sentence naming the signal that decided the tier. */
  reason: string;
  /** 0 is most urgent; used for sorting. */
  rank: number;
}

/** Thresholds, exported so the page text and the rules never drift apart. */
export const EPSS_HIGH = 0.1;
export const EPSS_ELEVATED = 0.01;
export const CVSS_CRITICAL = 9;
export const CVSS_HIGH = 7;

const pct = (value: number) => `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;

export function tierFor(entry: PrioritiseEntry): TierInfo {
  if (!entry.found && !entry.inKev) {
    return { tier: 'unknown', label: 'Not found', reason: 'WhatCyber has no record of this ID.', rank: 4 };
  }
  if (entry.inKev) {
    return {
      tier: 'now',
      label: 'Patch now',
      reason: entry.ransomware ? 'Listed in CISA KEV and known to be used in ransomware campaigns.' : 'Listed in CISA KEV: exploitation has been seen in the wild.',
      rank: 0,
    };
  }
  const { epss, cvssScore } = entry;
  if (epss != null && epss >= EPSS_HIGH) {
    return { tier: 'soon', label: 'Patch soon', reason: `EPSS puts the chance of exploitation in the next 30 days at ${pct(epss)}.`, rank: 1 };
  }
  if (cvssScore != null && cvssScore >= CVSS_CRITICAL) {
    return { tier: 'soon', label: 'Patch soon', reason: `Critical severity (CVSS ${cvssScore.toFixed(1)}), though not listed in KEV.`, rank: 1 };
  }
  if ((cvssScore != null && cvssScore >= CVSS_HIGH) || (epss != null && epss >= EPSS_ELEVATED)) {
    const why = cvssScore != null && cvssScore >= CVSS_HIGH ? `High severity (CVSS ${cvssScore.toFixed(1)})` : `EPSS ${pct(epss as number)}`;
    const outlook = epss == null ? 'no EPSS score yet' : 'exploitation looks unlikely for now';
    return { tier: 'plan', label: 'Plan the fix', reason: `${why}; not listed in KEV and ${outlook}.`, rank: 2 };
  }
  if (cvssScore == null && epss == null) {
    return { tier: 'routine', label: 'Routine', reason: 'No CVSS v3 or EPSS score is available yet; check again once NVD has scored it.', rank: 3 };
  }
  const epssNote = epss == null ? 'EPSS not scored yet' : 'low EPSS';
  return { tier: 'routine', label: 'Routine', reason: `Not listed in KEV, ${epssNote} and below high severity.`, rank: 3 };
}

export interface PrioritiseSummary {
  total: number;
  now: number;
  soon: number;
  plan: number;
  routine: number;
  unknown: number;
  ransomware: number;
}

export function summarise(entries: PrioritiseEntry[]): PrioritiseSummary {
  const summary: PrioritiseSummary = { total: entries.length, now: 0, soon: 0, plan: 0, routine: 0, unknown: 0, ransomware: 0 };
  for (const entry of entries) {
    summary[tierFor(entry).tier]++;
    if (entry.ransomware) summary.ransomware++;
  }
  return summary;
}

export type PrioritiseSort = 'priority' | 'epss' | 'cvss' | 'input';

/** Most urgent first. Within a tier: KEV due date, then EPSS, then CVSS. `input` keeps the order pasted. */
export function sortPrioritised(entries: PrioritiseEntry[], sort: PrioritiseSort): PrioritiseEntry[] {
  if (sort === 'input') return [...entries];
  const num = (value: number | null) => (value == null ? Number.NEGATIVE_INFINITY : value);
  const byEpss = (a: PrioritiseEntry, b: PrioritiseEntry) => num(b.epss) - num(a.epss);
  const byCvss = (a: PrioritiseEntry, b: PrioritiseEntry) => num(b.cvssScore) - num(a.cvssScore);
  const compare = (a: PrioritiseEntry, b: PrioritiseEntry): number => {
    if (sort === 'epss') return byEpss(a, b) || byCvss(a, b);
    if (sort === 'cvss') return byCvss(a, b) || byEpss(a, b);
    const dueA = a.kevDueDate ? Date.parse(a.kevDueDate) : Number.POSITIVE_INFINITY;
    const dueB = b.kevDueDate ? Date.parse(b.kevDueDate) : Number.POSITIVE_INFINITY;
    return tierFor(a).rank - tierFor(b).rank || (Number(b.ransomware) - Number(a.ransomware)) || dueA - dueB || byEpss(a, b) || byCvss(a, b);
  };
  return [...entries].sort((a, b) => compare(a, b) || a.cveId.localeCompare(b.cveId));
}

function csvCell(value: string | number | boolean | null): string {
  const text = value == null ? '' : String(value);
  // A leading = + - @ would run as a formula in a spreadsheet; the apostrophe keeps it as text.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(entries: PrioritiseEntry[]): string {
  const header = ['CVE', 'Priority', 'Reason', 'In KEV', 'KEV due date', 'Ransomware use', 'CVSS v3', 'EPSS', 'EPSS percentile', 'Vendors', 'Published'];
  const rows = entries.map((e) => {
    const info = tierFor(e);
    return [e.cveId, info.label, info.reason, e.inKev ? 'Yes' : 'No', e.kevDueDate, e.ransomware ? 'Known' : 'Unknown', e.cvssScore, e.epss, e.epssPercentile, e.vendors.join('; '), e.publishedDate];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}
