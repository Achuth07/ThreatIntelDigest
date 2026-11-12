import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation, useSearch } from 'wouter';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_TITLE,
  canonicalFor,
  isNoindexPath,
} from '@/lib/seo-core';

// Re-exported for existing imports; the rules live in lib/seo-core.ts so the server shares them.
export { canonicalFor, isNoindexPath };

// The server (api/page.ts) and the build write generic or page-specific description, robots,
// canonical, Open Graph and Twitter tags into the HTML for crawlers that do not run JavaScript.
// Helmet adds its own copies next to them instead of replacing them, so once a page renders, drop
// the ones that came with the HTML and let Helmet set them (otherwise a page carries two).
const STATIC_HEAD_TAGS =
  'head meta[name="description"]:not([data-rh]), head meta[name="keywords"]:not([data-rh]), ' +
  'head meta[name="robots"]:not([data-rh]), head link[rel="canonical"]:not([data-rh]), ' +
  'head meta[property^="og:"]:not([data-rh]), head meta[name^="twitter:"]:not([data-rh]), ' +
  'head meta[property^="twitter:"]:not([data-rh])';

function removeStaticHeadTags() {
  document.querySelectorAll(STATIC_HEAD_TAGS).forEach((element) => element.remove());
}

// Structured data the server wrote into the HTML stays unless the page supplies its own (the landing
// page and blog posts do), in which case Helmet's copy replaces it so a page never carries two.
function removeServerJsonLd() {
  document.querySelectorAll('head script[data-ssr-jsonld]').forEach((element) => element.remove());
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
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
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

  useEffect(() => {
    removeStaticHeadTags();
    if (structuredData) removeServerJsonLd();
  }, []);

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
