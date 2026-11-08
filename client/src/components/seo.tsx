import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation, useSearch } from 'wouter';

const SITE_URL = 'https://www.whatcyber.com';

// Shared social preview image: client/public/og-image.jpg, 1200x630.
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;
const DEFAULT_OG_IMAGE_ALT = 'WhatCyber: threat intelligence for security teams';

// index.html ships generic description, Open Graph and Twitter tags for crawlers that do not run
// JavaScript. Helmet adds its own page-specific copies next to them instead of replacing them, so
// a rendered page would carry two descriptions. Once a page renders, drop the static ones.
// (Goes away with server rendering, WHA-17.)
const STATIC_HEAD_TAGS =
  'head meta[name="description"]:not([data-rh]), head meta[name="keywords"]:not([data-rh]), ' +
  'head meta[name="robots"]:not([data-rh]), ' +
  'head meta[property^="og:"]:not([data-rh]), head meta[name^="twitter:"]:not([data-rh]), ' +
  'head meta[property^="twitter:"]:not([data-rh])';

function removeStaticHeadTags() {
  document.querySelectorAll(STATIC_HEAD_TAGS).forEach((element) => element.remove());
}

/**
 * Builds the self-referencing canonical URL for a path on the www host.
 *
 * - No query string, except `?page=N` (N > 1) so paginated hubs are not collapsed into page 1.
 * - No trailing slash, except the root. vercel.json permanently redirects
 *   every other trailing-slash URL to the slashless one (WHA-10).
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
const NOINDEX_PATHS = [
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

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  /** Override only when the canonical differs from the current path (e.g. a duplicate route). */
  url?: string;
  type?: string;
  keywords?: string;
  structuredData?: Record<string, any>;
  /** Defaults to true on the account, utility and /article paths, false elsewhere. */
  noindex?: boolean;
}

export const SEO: React.FC<SEOProps> = ({
  title = 'WhatCyber - ThreatFeed',
  description = 'Threat intelligence dashboard: track CISA Known Exploited Vulnerabilities, CVEs, threat actor profiles and cybersecurity news in one place.',
  image = DEFAULT_OG_IMAGE,
  url,
  type = 'website',
  keywords,
  structuredData,
  noindex
}) => {
  const [location] = useLocation();
  const search = useSearch();
  const canonicalUrl = url || canonicalFor(location, search);
  const hidden = noindex ?? isNoindexPath(location);

  useEffect(removeStaticHeadTags, []);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="author" content="WhatCyber" />
      <meta name="robots" content={hidden ? 'noindex, follow' : 'index, follow'} />

      {/* Open Graph tags */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      {/* Width, height and alt are only known for the shared image (no fragments: Helmet rejects them) */}
      {image === DEFAULT_OG_IMAGE && <meta property="og:image:width" content="1200" />}
      {image === DEFAULT_OG_IMAGE && <meta property="og:image:height" content="630" />}
      {image === DEFAULT_OG_IMAGE && <meta property="og:image:alt" content={DEFAULT_OG_IMAGE_ALT} />}

      {/* Twitter tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};
