/**
 * Structured data (JSON-LD) for the public pages, in one place.
 *
 * The server writes these into the HTML (api/page.ts and the build) so crawlers that do not run
 * JavaScript see them; the landing page and blog post also pass theirs to the SEO component.
 * Keep this file free of React and browser APIs, the server imports it too.
 */

import { SITE_URL } from './seo-core.js';

type Json = Record<string, any>;

const CONTEXT = 'https://schema.org';

export const WEBSITE_ID = `${SITE_URL}/#website`;
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export const websiteNode = (): Json => ({
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: 'WhatCyber',
  url: `${SITE_URL}/`,
  publisher: { '@id': ORGANIZATION_ID },
});

export const organizationNode = (): Json => ({
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: 'WhatCyber',
  url: SITE_URL,
  logo: `${SITE_URL}/android-chrome-512x512.png`,
  sameAs: ['https://x.com/WhatCyber_', 'https://www.linkedin.com/company/whatcyber/'],
});

// The site and its publisher, defined in every page's graph so references by @id resolve.
const siteNodes = (): Json[] => [websiteNode(), organizationNode()];

/** Home > hub > page. Items are { name, path } with paths on the www host. */
export const breadcrumbNode = (pageUrl: string, items: { name: string; path: string }[]): Json => ({
  '@type': 'BreadcrumbList',
  '@id': `${pageUrl}#breadcrumb`,
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: `${SITE_URL}${item.path}`,
  })),
});

const iso = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value as any);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const compact = (value: Json): Json => {
  Object.keys(value).forEach((key) => value[key] === undefined && delete value[key]);
  return value;
};

const webPageNode = (pageUrl: string, fields: Json): Json =>
  compact({
    '@type': 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    inLanguage: 'en',
    isPartOf: { '@id': WEBSITE_ID },
    breadcrumb: { '@id': `${pageUrl}#breadcrumb` },
    ...fields,
  });

/** CVE detail page: the page itself plus its breadcrumb. */
export function cveJsonLd(input: {
  id: string;
  title: string;
  description: string;
  isKev: boolean;
  published?: unknown;
  modified?: unknown;
}): Json {
  const pageUrl = `${SITE_URL}/cve/${input.id}`;
  return {
    '@context': CONTEXT,
    '@graph': [
      ...siteNodes(),
      webPageNode(pageUrl, {
        name: input.title,
        description: input.description,
        datePublished: iso(input.published),
        dateModified: iso(input.modified),
      }),
      breadcrumbNode(pageUrl, [
        { name: 'Home', path: '/' },
        { name: input.isKev ? 'CISA KEV catalog' : 'Vulnerabilities', path: input.isKev ? '/cisa-kev' : '/cve' },
        { name: input.id, path: `/cve/${input.id}` },
      ]),
    ],
  };
}

/** Threat actor profile: the page, the group it is about, and its breadcrumb. */
export function actorJsonLd(input: {
  slug: string;
  name: string;
  title: string;
  description: string;
  aliases?: string[] | null;
}): Json {
  const pageUrl = `${SITE_URL}/threat-actors/${input.slug}`;
  const aliases = (input.aliases ?? []).filter(Boolean);
  return {
    '@context': CONTEXT,
    '@graph': [
      ...siteNodes(),
      webPageNode(pageUrl, {
        name: input.title,
        description: input.description,
        about: compact({
          '@type': 'Thing',
          name: input.name,
          alternateName: aliases.length ? aliases : undefined,
        }),
      }),
      breadcrumbNode(pageUrl, [
        { name: 'Home', path: '/' },
        { name: 'Threat actors', path: '/threat-actors' },
        { name: input.name, path: `/threat-actors/${input.slug}` },
      ]),
    ],
  };
}

/** A listing page: /cve, /cisa-kev, /threat-actors. */
export function hubJsonLd(input: { path: string; name: string; title: string; description: string }): Json {
  const pageUrl = `${SITE_URL}${input.path}`;
  return {
    '@context': CONTEXT,
    '@graph': [
      ...siteNodes(),
      webPageNode(pageUrl, { '@type': 'CollectionPage', name: input.title, description: input.description }),
      breadcrumbNode(pageUrl, [
        { name: 'Home', path: '/' },
        { name: input.name, path: input.path },
      ]),
    ],
  };
}

/** Blog post: an article with a named author, plus its breadcrumb. */
export function blogPostJsonLd(input: {
  slug: string;
  title: string;
  description?: string;
  image?: string | null;
  published?: unknown;
  modified?: unknown;
  authorName?: string | null;
}): Json {
  const pageUrl = `${SITE_URL}/blog/${input.slug}`;
  return {
    '@context': CONTEXT,
    '@graph': [
      ...siteNodes(),
      compact({
        '@type': 'BlogPosting',
        '@id': `${pageUrl}#article`,
        mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
        headline: input.title,
        description: input.description,
        image: input.image ? [input.image] : undefined,
        datePublished: iso(input.published),
        dateModified: iso(input.modified ?? input.published),
        author: { '@type': 'Person', name: input.authorName || 'WhatCyber Team' },
        publisher: { '@id': ORGANIZATION_ID },
      }),
      breadcrumbNode(pageUrl, [
        { name: 'Home', path: '/' },
        { name: 'Blog', path: '/blog' },
        { name: input.title, path: `/blog/${input.slug}` },
      ]),
    ],
  };
}

/**
 * The landing page FAQ. Shown on the page, in the server-rendered copy (server/services/page-body.ts)
 * and as FAQPage structured data, so all three say the same thing.
 */
export const LANDING_FAQ: { question: string; answer: string }[] = [
  {
    question: 'What is WhatCyber?',
    answer:
      "WhatCyber is a comprehensive cybersecurity threat intelligence aggregator. It collects and organizes the latest security news, CVE vulnerabilities, and threat reports from trusted sources like Bleeping Computer, Unit 42, and Dark Reading into a single, real-time dashboard.",
  },
  {
    question: 'What are KEVs and why do they matter?',
    answer:
      "KEVs, or Known Exploited Vulnerabilities, are security flaws that are actively being used by attackers in the wild. We integrate the CISA KEV catalog to help you prioritize patching the most dangerous vulnerabilities first.",
  },
  {
    question: 'What information is in the Threat Actor profiles?',
    answer:
      "Our Threat Actor Directory combines MITRE ATT&CK framework data with real-time news. You get detailed insights into an actor's aliases, targeted sectors, methods, and the latest activities associated with them.",
  },
  {
    question: 'Is WhatCyber free to use?',
    answer:
      "Yes, WhatCyber offers a free tier that provides access to essential threat intelligence feeds, vulnerability updates, and threat actor profiles. We believe in democratizing access to cybersecurity information.",
  },
  {
    question: 'How often is the threat feed updated?',
    answer:
      "Our threat feed is updated in real-time. As soon as our sources publish new information, it is automatically aggregated and displayed on your dashboard, ensuring you never miss critical security updates.",
  },
  {
    question: 'Can I customize my news sources?',
    answer:
      "Absolutely. WhatCyber allows you to follow specific RSS feeds and customize your dashboard to focus on the sources and topics that matter most to you and your organization.",
  },
];

/**
 * Landing page: the site, the organisation and the FAQ.
 *
 * No SoftwareApplication node: Google only accepts one with an aggregateRating or review, which
 * WhatCyber does not have, and the incomplete node showed as a markup error (WHA-97).
 */
export function landingJsonLd(): Json {
  return {
    '@context': CONTEXT,
    '@graph': [
      ...siteNodes(),
      {
        '@type': 'FAQPage',
        mainEntity: LANDING_FAQ.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      },
    ],
  };
}
