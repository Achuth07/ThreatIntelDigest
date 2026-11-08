/**
 * SEO rules shared by the app (client/src/components/seo.tsx) and the server
 * (api/page.ts, which writes the same tags into the HTML for crawlers that do not run JavaScript).
 * Keep this file free of React and browser APIs so both sides can import it.
 */

export const SITE_URL = 'https://www.whatcyber.com';

// Shared social preview image: client/public/og-image.jpg, 1200x630.
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;
export const DEFAULT_OG_IMAGE_ALT = 'WhatCyber: threat intelligence for security teams';

export const DEFAULT_TITLE = 'WhatCyber - ThreatFeed';
export const DEFAULT_DESCRIPTION =
  'Threat intelligence dashboard: track CISA Known Exploited Vulnerabilities, CVEs, threat actor profiles and cybersecurity news in one place.';

/**
 * Builds the self-referencing canonical URL for a path on the www host.
 *
 * - No query string, except `?page=N` (N > 1) so paginated hubs are not collapsed into page 1.
 * - No trailing slash, except the root. vercel.json permanently redirects every other
 *   trailing-slash URL to the slashless one.
 */
export function canonicalFor(pathname: string, search = ''): string {
  const path = pathname.split(/[?#]/)[0] || '/';
  if (path === '/') return `${SITE_URL}/`;

  const trimmed = path.replace(/\/+$/, '');

  const page = parseInt(new URLSearchParams(search).get('page') ?? '', 10);
  return `${SITE_URL}${trimmed}${page > 1 ? `?page=${page}` : ''}`;
}

// Pages that must stay out of search results: account and utility pages, and /article, which
// shows third-party article text. Keep in step with the X-Robots-Tag rule in vercel.json, which
// covers crawlers that do not run JavaScript.
export const NOINDEX_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/set-password',
  '/onboarding',
  '/settings',
  '/watchlist',
  '/admin',
  '/report-bugs',
  '/article',
];

export function isNoindexPath(pathname: string): boolean {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return NOINDEX_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
