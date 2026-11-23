/**
 * Answer-first intros and primary sources for the hub and CVE pages (WHA-28).
 *
 * One source for the pages, the server-rendered copy (server/services/page-body.ts) and llms.txt's
 * description, so a person, a crawler and an AI answer engine read the same direct answer and can
 * follow the same primary sources. Keep this file free of React and browser APIs.
 */

export interface Source {
  name: string;
  url: string;
}

const SRC = {
  kev: { name: 'CISA Known Exploited Vulnerabilities catalog', url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog' },
  nvd: { name: 'National Vulnerability Database', url: 'https://nvd.nist.gov/' },
  epss: { name: 'FIRST EPSS', url: 'https://www.first.org/epss/' },
  attack: { name: 'MITRE ATT&CK', url: 'https://attack.mitre.org/groups/' },
  cwe: { name: 'MITRE CWE', url: 'https://cwe.mitre.org/' },
} satisfies Record<string, Source>;

export type HubKind = 'kev' | 'cve' | 'actors' | 'vendors' | 'cwe' | 'vendor' | 'product' | 'weakness';

const SOURCES_BY_KIND: Record<HubKind, Source[]> = {
  kev: [SRC.kev, SRC.nvd],
  cve: [SRC.nvd, SRC.epss, SRC.kev],
  actors: [SRC.attack],
  vendors: [SRC.nvd, SRC.kev],
  cwe: [SRC.cwe, SRC.nvd],
  vendor: [SRC.nvd, SRC.kev],
  product: [SRC.kev, SRC.nvd],
  weakness: [SRC.cwe, SRC.nvd],
};

export const sourcesFor = (kind: HubKind): Source[] => SOURCES_BY_KIND[kind];

/** The records behind one CVE page: NVD, the CISA catalog entry when it is listed, and the CVE Program record. */
export function cveSources(cveId: string, isKev: boolean): Source[] {
  const id = encodeURIComponent(cveId);
  return [
    { name: 'NVD record', url: `https://nvd.nist.gov/vuln/detail/${id}` },
    ...(isKev ? [{ name: 'CISA KEV catalog entry', url: `https://www.cisa.gov/known-exploited-vulnerabilities-catalog?field_cve=${id}` }] : []),
    { name: 'CVE Program record', url: `https://www.cve.org/CVERecord?id=${id}` },
  ];
}

/**
 * The direct answer that opens each hub page. Counts are added next to it by the page, so this text
 * does not go stale.
 */
export const HUB_ANSWERS = {
  cve: 'A CVE (Common Vulnerabilities and Exposures) entry is the public identifier of a disclosed security flaw. This page lists the newest CVEs from the National Vulnerability Database with their CVSS severity scores; each CVE page adds the EPSS exploit probability, the affected vendors and whether CISA lists the flaw as exploited.',
  actors:
    'A threat actor is a group of attackers that security researchers track under one name, such as APT28 or Lazarus Group. This directory profiles the groups catalogued by MITRE ATT&CK, with their aliases, descriptions and the latest news that names them.',
  vendors:
    'This page ranks the vendors with the most CVEs in the National Vulnerability Database. Each vendor page lists its newest CVEs, the ones CISA has confirmed are exploited, its products with exploited vulnerabilities and the weaknesses behind most of its flaws.',
  feed: 'The threat feed collects the newest cybersecurity news from trusted security publishers in one list, newest first, with a short summary of each story. Every headline links to the original article on the publisher\'s site.',
  cwe: 'CWE, the Common Weakness Enumeration, is the MITRE catalog of software weakness types, such as cross-site scripting (CWE-79) or out-of-bounds write (CWE-787). This page ranks the weaknesses behind the most CVEs and shows how many of those CVEs are known to be exploited.',
} as const;

/** "2026-11-20" for a date-like value, or '' when it is missing or invalid. */
export function isoDay(value: unknown): string {
  if (!value) return '';
  const date = new Date(value as any);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}
