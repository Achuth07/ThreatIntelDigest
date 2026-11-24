/**
 * KEV exposure checker (WHA-29): the pure parts shared by the page and the API. A "stack" is the list of
 * vendors and products a visitor runs; the result is every CISA KEV entry that matches one of them.
 * Keep this file free of React and browser APIs, the server uses it too.
 */

export interface StackItem {
  vendor: string;
  /** Empty = every product of the vendor. */
  product: string;
}

export const MAX_STACK_ITEMS = 25;
export const MAX_EXPOSURE_ROWS = 1000;
/** A due date within this many days counts as "due soon". */
export const DUE_SOON_DAYS = 14;
/** An entry added within this many days counts as "new". */
export const NEW_DAYS = 30;

const SEPARATOR = '|';

/** `Vendor` or `Vendor|Product`, the form used in ?item= parameters. */
export function stackItemKey(item: StackItem): string {
  return item.product ? `${item.vendor}${SEPARATOR}${item.product}` : item.vendor;
}

export function parseStackItem(text: string): StackItem | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 200) return null;
  const at = trimmed.indexOf(SEPARATOR);
  const vendor = (at === -1 ? trimmed : trimmed.slice(0, at)).trim();
  const product = at === -1 ? '' : trimmed.slice(at + 1).trim();
  return vendor ? { vendor, product } : null;
}

/** Cleans a list of ?item= values: drops bad and repeated ones and keeps at most MAX_STACK_ITEMS. */
export function parseStack(values: string[]): StackItem[] {
  const seen = new Set<string>();
  const items: StackItem[] = [];
  for (const value of values) {
    const item = parseStackItem(value);
    if (!item) continue;
    const key = stackItemKey(item).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
    if (items.length >= MAX_STACK_ITEMS) break;
  }
  return items;
}

export interface ExposureEntry {
  cveId: string;
  vendor: string;
  product: string;
  name: string;
  /** ISO dates (yyyy-mm-dd) or null. */
  dateAdded: string | null;
  dueDate: string | null;
  ransomware: boolean;
  cvssScore: number | null;
  epss: number | null;
}

export type DueStatus = 'past' | 'soon' | 'later' | 'none';

const DAY = 86_400_000;

export function daysBetween(fromIso: string, to: Date): number {
  return Math.floor((Date.parse(fromIso) - Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())) / DAY);
}

/** Where the CISA due date stands today. */
export function dueStatus(dueDate: string | null, now: Date): DueStatus {
  if (!dueDate) return 'none';
  const days = daysBetween(dueDate, now);
  if (days < 0) return 'past';
  if (days <= DUE_SOON_DAYS) return 'soon';
  return 'later';
}

export interface ExposureSummary {
  total: number;
  ransomware: number;
  pastDue: number;
  dueSoon: number;
  addedRecently: number;
  vendors: number;
}

export function summarize(entries: ExposureEntry[], now: Date): ExposureSummary {
  const summary: ExposureSummary = { total: entries.length, ransomware: 0, pastDue: 0, dueSoon: 0, addedRecently: 0, vendors: new Set(entries.map((e) => e.vendor)).size };
  for (const entry of entries) {
    if (entry.ransomware) summary.ransomware++;
    const status = dueStatus(entry.dueDate, now);
    if (status === 'past') summary.pastDue++;
    if (status === 'soon') summary.dueSoon++;
    if (entry.dateAdded && -daysBetween(entry.dateAdded, now) <= NEW_DAYS) summary.addedRecently++;
  }
  return summary;
}

export type ExposureSort = 'due' | 'added' | 'score';

/** Most urgent first. Entries without the sort value go last. */
export function sortEntries(entries: ExposureEntry[], sort: ExposureSort): ExposureEntry[] {
  const key = (e: ExposureEntry): number => {
    if (sort === 'due') return e.dueDate ? Date.parse(e.dueDate) : Number.POSITIVE_INFINITY;
    if (sort === 'added') return e.dateAdded ? -Date.parse(e.dateAdded) : Number.POSITIVE_INFINITY;
    return e.cvssScore != null ? -e.cvssScore : Number.POSITIVE_INFINITY;
  };
  return [...entries].sort((a, b) => key(a) - key(b) || a.cveId.localeCompare(b.cveId));
}

function csvCell(value: string | number | boolean | null): string {
  const text = value == null ? '' : String(value);
  // A leading = + - @ would run as a formula in a spreadsheet; the apostrophe keeps it as text.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(entries: ExposureEntry[]): string {
  const header = ['CVE', 'Vendor', 'Product', 'Name', 'Date added', 'CISA due date', 'Ransomware use', 'CVSS v3', 'EPSS'];
  const rows = entries.map((e) => [e.cveId, e.vendor, e.product, e.name, e.dateAdded, e.dueDate, e.ransomware ? 'Known' : 'Unknown', e.cvssScore, e.epss]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}
