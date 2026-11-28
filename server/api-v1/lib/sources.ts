import { GENERAL_SECURITY_NEWS, GOVERNMENT_ALERTS, MALWARE_RESEARCH, VENDOR_THREAT_RESEARCH } from '../../../client/src/lib/rss-sources.js';

// The curated feeds the API may serve news from (WHA-63). rss_sources also holds feeds that
// people added in the app, with nothing marking who added them, so the API only covers the
// built-in list the site ships with.

export const SOURCE_CATEGORIES = ['vendor_research', 'government', 'malware_research', 'news'] as const;
export type SourceCategory = (typeof SOURCE_CATEGORIES)[number];

const GROUPS: [SourceCategory, { name: string; url: string }[]][] = [
  ['vendor_research', VENDOR_THREAT_RESEARCH],
  ['government', GOVERNMENT_ALERTS],
  ['malware_research', MALWARE_RESEARCH],
  ['news', GENERAL_SECURITY_NEWS],
];

export const CURATED_SOURCES = GROUPS.flatMap(([category, list]) => list.map(s => ({ name: s.name, url: s.url, category })));

const byName = new Map(CURATED_SOURCES.map(s => [s.name.toLowerCase(), s]));
const byUrl = new Map(CURATED_SOURCES.map(s => [s.url, s]));

export const CURATED_NAMES = CURATED_SOURCES.map(s => s.name);

export function curatedSource(name: string, url?: string) {
  return byName.get(name.toLowerCase()) ?? (url ? byUrl.get(url) : undefined);
}
