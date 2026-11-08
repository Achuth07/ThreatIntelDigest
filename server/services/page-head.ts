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
} from '../../client/src/lib/seo-core';
import { NOT_FOUND_META, STATIC_PAGE_META } from '../../client/src/lib/page-meta';
import { actorSeo, cveSeo } from '../../client/src/lib/seo-text';
import type { HeadTags } from './head-inject';

export interface PageHead extends HeadTags {
  status: 200 | 404;
}

export interface PageData {
  /** null = no such record. Throws only when the data source itself fails. */
  getKev(cveId: string): Promise<{
    vendor_project: string;
    product: string;
    short_description: string;
  } | null>;
  getVulnerability(cveId: string): Promise<{ vendors: string[]; hasR2Backing: boolean } | null>;
  /** The NVD description for CVEs whose text is stored outside the database; '' when unavailable. */
  getVulnerabilityDescription(cveId: string): Promise<string>;
  getActor(id: string): Promise<{ name: string; aliases: string[] | null; description: string | null } | null>;
  getPost(slug: string): Promise<{
    title: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    excerpt?: string | null;
    imageUrl?: string | null;
  } | null>;
}

const CVE_ID = /^CVE-\d{4}-\d{4,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    return {
      status: 200,
      title: fixed.title,
      description: fixed.description,
      canonical: canonicalFor(pathname),
      noindex: isNoindexPath(pathname),
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

  if (segments.length === 2 && (section === 'exploited-vulnerabilities' || section === 'vulnerabilities')) {
    if (!CVE_ID.test(id)) return notFound('Vulnerability Not Found | WhatCyber', 'This vulnerability could not be found.');

    const [kev, nvd] = await Promise.all([data.getKev(id), data.getVulnerability(id)]);
    if (!kev && !nvd) return notFound('Vulnerability Not Found | WhatCyber', 'This vulnerability could not be found.');

    // Same inputs as client/src/pages/cve-detail.tsx: KEV text when it is in the KEV catalog.
    const vendors = nvd?.vendors ?? [];
    const description = kev
      ? kev.short_description
      : nvd?.hasR2Backing
        ? await data.getVulnerabilityDescription(id)
        : '';

    const seo = cveSeo({
      cveID: id,
      vendor: kev ? kev.vendor_project : vendors.length > 0 ? vendors.join(', ') : 'Unknown Vendor',
      product: kev ? kev.product : '',
      isKev: Boolean(kev),
      description,
    });

    // Each CVE has two routes until they are merged; KEV entries canonicalise to the KEV URL.
    const canonicalPath = `${kev ? '/exploited-vulnerabilities/' : '/vulnerabilities/'}${id}`;
    return { status: 200, ...seo, canonical: `${SITE_URL}${canonicalPath}` };
  }

  if (segments.length === 2 && section === 'threat-actors') {
    if (!UUID.test(id)) return notFound('Threat Actor Not Found | WhatCyber', 'This threat actor profile could not be loaded.');

    const actor = await data.getActor(id);
    if (!actor) return notFound('Threat Actor Not Found | WhatCyber', 'This threat actor profile could not be loaded.');

    return {
      status: 200,
      ...actorSeo({ name: actor.name, aliases: actor.aliases, description: actor.description }),
      canonical: canonicalFor(pathname),
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
    };
  }

  // Not a page of the app (the route list in vercel.json should not send these here).
  return notFound(NOT_FOUND_META.title, NOT_FOUND_META.description);
}
