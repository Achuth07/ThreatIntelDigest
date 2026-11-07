import { Helmet } from 'react-helmet-async';
import { useLocation, useSearch } from 'wouter';

const SITE_URL = 'https://www.whatcyber.com';

/**
 * Builds the self-referencing canonical URL for a path on the www host.
 *
 * - No query string, except `?page=N` (N > 1) so paginated hubs are not collapsed into page 1.
 * - No trailing slash, except the root and /threatfeed/, which vercel.json
 *   permanently redirects to its trailing-slash form. (A single site-wide
 *   trailing-slash rule is tracked in WHA-10.)
 */
export function canonicalFor(pathname: string, search = ''): string {
  const path = pathname.split(/[?#]/)[0] || '/';
  if (path === '/') return `${SITE_URL}/`;

  const trimmed = path.replace(/\/+$/, '');
  if (trimmed === '/threatfeed') return `${SITE_URL}/threatfeed/`;

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
  description = 'Free threat intelligence dashboard: track CISA Known Exploited Vulnerabilities, CVEs, threat actor profiles and cybersecurity news in one place.',
  image = `${SITE_URL}/og-image.jpg`,
  url,
  type = 'website',
  keywords,
  structuredData
}) => {
  const [location] = useLocation();
  const search = useSearch();
  const canonicalUrl = url || canonicalFor(location, search);

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
