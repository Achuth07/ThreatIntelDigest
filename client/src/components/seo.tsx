import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  keywords?: string;
  structuredData?: Record<string, any>;
}

export const SEO: React.FC<SEOProps> = ({
  title = 'WhatCyber - ThreatFeed',
  description = 'Advanced cybersecurity solutions powered by AI. Protecting your digital assets with next-generation threat intelligence and automated defense systems.',
  image = 'https://www.whatcyber.com/og-image.jpg',
  url,
  type = 'website',
  keywords,
  structuredData
}) => {
  // For threatfeed routes, use the correct canonical URL structure
  const canonicalUrl = url || `https://www.whatcyber.com/threatfeed/`;

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