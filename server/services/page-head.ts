/**
 * Decides, for a page URL, which <head> tags the server writes into the HTML and which HTTP status
 * it answers with. Pure logic over an injected data source, so it can be tested without a database.
 *
 * Titles and descriptions come from the same helpers the app uses (client/src/lib/seo-text.ts,
 * page-meta.ts), so what a link-preview crawler sees matches what the browser shows after
 * JavaScript runs. A record that does not exist answers 404, which only the server can know.
 */

import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_URL,
  canonicalFor,
  isNoindexPath,
} from '../../client/src/lib/seo-core.js';
import { NOT_FOUND_META, STATIC_PAGE_META } from '../../client/src/lib/page-meta.js';
import { actorSeo, cveSeo } from '../../client/src/lib/seo-text.js';
import { UUID_PATTERN, actorUrl, cveUrl } from '../../client/src/lib/urls.js';
import { actorJsonLd, blogPostJsonLd, cveJsonLd, hubJsonLd } from '../../client/src/lib/jsonld.js';
import type { HeadTags } from './head-inject.js';
import { renderActorBody, renderCveBody, type CveBodyData } from './page-body.js';

export interface PageHead extends HeadTags {
  status: 200 | 301 | 404;
  /** Where a 301 sends the visitor. */
  redirect?: string;
  /** Readable page content written into the HTML (see page-body.ts). */
  body?: string;
}

export interface PageData {
  /**
   * Everything the CVE page shows: the KEV entry and the NVD record, with the description and
   * references read from storage when they live there. null = no such CVE. Throws only when the
   * data source itself fails.
   */
  getCve(cveId: string): Promise<CveBodyData | null>;
  /** Looks a threat actor up by slug or by id (the old address). */
  getActor(idOrSlug: string): Promise<{
    id: string;
    slug: string | null;
    name: string;
    aliases: string[] | null;
    description: string | null;
  } | null>;
  getPost(slug: string): Promise<{
    title: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    excerpt?: string | null;
    imageUrl?: string | null;
    publishedAt?: string | null;
    updatedAt?: string | null;
    authorName?: string | null;
  } | null>;
}

const CVE_ID = /^CVE-\d{4}-\d{4,}$/;
// Listing pages that get a CollectionPage and breadcrumb.
const HUB_NAMES: Record<string, string> = {
  '/cve': 'Latest CVEs',
  '/cisa-kev': 'CISA KEV catalog',
  '/threat-actors': 'Threat actors',
};

const redirectTo = (path: string): PageHead => ({
  status: 301,
  redirect: path,
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
});

const notFound = (title: string, description: string): PageHead => ({
  status: 404,
  title,
  description,
  noindex: true,
});

export async function resolvePageHead(rawPathname: string, data: PageData): Promise<PageHead> {
  const pathname = rawPathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const segments = pathname.split('/').filter(Boolean);
  const [section, id] = segments;

  // Fixed pages with their own title and description.
  const fixed = STATIC_PAGE_META[pathname];
  if (fixed && segments.length <= 1) {
    const hubName = HUB_NAMES[pathname];
    return {
      status: 200,
      title: fixed.title,
      description: fixed.description,
      canonical: canonicalFor(pathname),
      noindex: isNoindexPath(pathname),
      jsonLd: hubName
        ? hubJsonLd({ path: pathname, name: hubName, title: fixed.title, description: fixed.description })
        : undefined,
    };
  }

  // The dashboard has no page-specific text of its own yet.
  if (pathname === '/dashboard') {
    return {
      status: 200,
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      canonical: canonicalFor(pathname),
    };
  }

  // Other fixed pages (login, settings, ...) and /article/*: generic text, kept out of the index.
  if (isNoindexPath(pathname)) {
    return {
      status: 200,
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      noindex: true,
    };
  }

  if (segments.length === 2 && section === 'cve') {
    if (!/^CVE-\d{4}-\d{4,}$/i.test(id)) return notFound('Vulnerability Not Found | WhatCyber', 'This vulnerability could not be found.');
    // One address per CVE: the id is upper case.
    if (!CVE_ID.test(id)) return redirectTo(cveUrl(id.toUpperCase()));

    const record = await data.getCve(id);
    if (!record) return notFound('Vulnerability Not Found | WhatCyber', 'This vulnerability could not be found.');
    const { kev, nvd } = record;

    // Same inputs as client/src/pages/cve-detail.tsx: KEV text when it is in the KEV catalog.
    const vendors = nvd?.vendors ?? [];
    const description = kev ? kev.shortDescription : nvd?.description ?? '';

    const seo = cveSeo({
      cveID: id,
      vendor: kev ? kev.vendorProject : vendors.length > 0 ? vendors.join(', ') : 'Unknown Vendor',
      product: kev ? kev.product : '',
      isKev: Boolean(kev),
      description,
    });

    return {
      status: 200,
      ...seo,
      canonical: `${SITE_URL}${cveUrl(id)}`,
      body: renderCveBody(record),
      jsonLd: cveJsonLd({
        id,
        title: seo.title,
        description: seo.description,
        isKev: Boolean(kev),
        published: nvd?.publishedDate ?? kev?.dateAdded,
        modified: nvd?.lastModifiedDate ?? kev?.dateAdded,
      }),
    };
  }

  if (segments.length === 2 && section === 'threat-actors') {
    const actor = await data.getActor(UUID_PATTERN.test(id) ? id : id.toLowerCase());
    if (!actor) return notFound('Threat Actor Not Found | WhatCyber', 'This threat actor profile could not be loaded.');

    // The old id-based address, or a slug in the wrong case, moves to the readable one.
    if (actor.slug && id !== actor.slug) return redirectTo(actorUrl(actor));

    const seo = actorSeo({ name: actor.name, aliases: actor.aliases, description: actor.description });
    return {
      status: 200,
      ...seo,
      canonical: canonicalFor(pathname),
      body: renderActorBody(actor),
      jsonLd: actorJsonLd({
        slug: actor.slug || actor.id,
        name: actor.name,
        title: seo.title,
        description: seo.description,
        aliases: actor.aliases,
      }),
    };
  }

  if (segments.length === 2 && section === 'blog') {
    const post = await data.getPost(id);
    if (!post) return notFound('Post not found | WhatCyber', 'This blog post could not be found.');

    return {
      status: 200,
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt || STATIC_PAGE_META['/blog'].description,
      canonical: canonicalFor(pathname),
      type: 'article',
      image: post.imageUrl || undefined,
      jsonLd: blogPostJsonLd({
        slug: id,
        title: post.seoTitle || post.title,
        description: post.seoDescription || post.excerpt || undefined,
        image: post.imageUrl,
        published: post.publishedAt,
        modified: post.updatedAt,
        authorName: post.authorName,
      }),
    };
  }

  // Not a page of the app (the route list in vercel.json should not send these here).
  return notFound(NOT_FOUND_META.title, NOT_FOUND_META.description);
}
