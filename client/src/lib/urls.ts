/**
 * Canonical URLs of the public pages, in one place (WHA-18).
 *
 * Every CVE has one address, /cve/CVE-YYYY-NNNN, whether or not it is in the CISA KEV catalog.
 * The KEV hub is /cisa-kev, and threat actors use readable slugs: /threat-actors/salt-typhoon.
 * Keep this file free of React and browser APIs, the server uses it too.
 */

export const CVE_HUB = '/cve';
export const KEV_HUB = '/cisa-kev';
export const ACTORS_HUB = '/threat-actors';

export const CVE_ID_PATTERN = /^CVE-\d{4}-\d{4,}$/i;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const cveUrl = (cveId: string) => `${CVE_HUB}/${cveId}`;

/** Actor address: the slug when there is one, otherwise the id (which the server redirects to the slug). */
export const actorUrl = (actor: { slug?: string | null; id: string }) =>
  `${ACTORS_HUB}/${actor.slug || actor.id}`;

/** "Salt Typhoon" -> "salt-typhoon". Lowercase letters and digits joined by single hyphens. */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Old public paths and where they now live. Each entry is a permanent redirect.
 * Source patterns use :id for the one variable segment.
 */
export const LEGACY_REDIRECTS: { source: string; destination: string }[] = [
  { source: '/vulnerabilities', destination: CVE_HUB },
  { source: '/vulnerabilities/:id', destination: `${CVE_HUB}/:id` },
  { source: '/exploited-vulnerabilities', destination: KEV_HUB },
  { source: '/exploited-vulnerabilities/:id', destination: `${CVE_HUB}/:id` },
];
