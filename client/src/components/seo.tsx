import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation, useSearch } from 'wouter';

const SITE_URL = 'https://www.whatcyber.com';

// index.html ships generic description, Open Graph and Twitter tags for crawlers that do not run
// JavaScript. Helmet adds its own page-specific copies next to them instead of replacing them, so
// a rendered page would carry two descriptions. Once a page renders, drop the static ones.
// (Goes away with server rendering, WHA-17.)
const STATIC_HEAD_TAGS =
  'head meta[name="description"]:not([data-rh]), head meta[name="keywords"]:not([data-rh]), ' +
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

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  /** Override only when the canonical differs from the current path (e.g. a duplicate route). */
  url?: string;
  type?: string;
  keywords?: string;
  structuredData?: Record<string, any>;
}

export const SEO: React.FC<SEOProps> = ({
  title = 'WhatCyber - ThreatFeed',
  description = 'Threat intelligence dashboard: track CISA Known Exploited Vulnerabilities, CVEs, threat actor profiles and cybersecurity news in one place.',
  image = `${SITE_URL}/og-image.jpg`,
  url,
  type = 'website',
  keywords,
  structuredData
}) => {
  const [location] = useLocation();
  const search = useSearch();
  const canonicalUrl = url || canonicalFor(location, search);

  useEffect(removeStaticHeadTags, []);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="author" content="WhatCyber" />
      <meta name="robots" content="index, follow" />

      {/* Open Graph tags */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

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
