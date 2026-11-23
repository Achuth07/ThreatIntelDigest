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
import { actorSeo, cveSeo, cweSeo, productSeo, vendorSeo } from '../../client/src/lib/seo-text.js';
import { CWE_HUB, CWE_ID_PATTERN, UUID_PATTERN, VENDORS_HUB, actorUrl, cveUrl, cweUrl, productUrl, vendorUrl } from '../../client/src/lib/urls.js';
import type { CweHub, CweIndexRow, ProductHub, VendorHub, VendorIndexRow } from './hub-data.js';
import { MIN_CVES_FOR_INDEX } from './hub-data.js';
import { KEV_FAQ } from '../../client/src/lib/kev-content.js';
import { CVSS4_LEGACY_PATH, CVSS_FAQ, CVSS_TOOL_PATH } from '../../client/src/lib/cvss-content.js';
import { actorJsonLd, blogPostJsonLd, cveJsonLd, hubJsonLd, landingJsonLd } from '../../client/src/lib/jsonld.js';
import type { HeadTags } from './head-inject.js';
import { renderActorBody, renderActorsHubBody, renderCveBody, renderCveHubBody, renderCvssToolBody, renderCweHubBody, renderCweIndexBody, renderFeedBody, renderKevHubBody, renderLandingBody, renderProductHubBody, renderVendorHubBody, renderVendorsIndexBody, type ActorsHubData, type CveBodyData, type FeedArticle, type CveHubData, type KevHubData } from './page-body.js';

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
  /** One page of the KEV catalog, newest first. Throws only when the data source itself fails. */
  getKevPage(page: number, pageSize: number): Promise<KevHubData>;
  /** The newest news articles, for the threat feed page. */
  getLatestArticles(limit: number): Promise<FeedArticle[]>;
  /** The top vendors and CWEs (vendor_stats, cwe_stats) and the hub behind each (WHA-24). */
  getVendorIndex(): Promise<VendorIndexRow[]>;
  getCweIndex(): Promise<CweIndexRow[]>;
  getVendorHub(slug: string): Promise<VendorHub | null>;
  getCweHub(id: string): Promise<CweHub | null>;
  getProductHub(vendorSlug: string, productSlug: string): Promise<ProductHub | null>;
  /** One page of the threat actor directory, most recently updated first. */
  getActorsPage(page: number, pageSize: number): Promise<ActorsHubData>;
  /** The newest CVEs and the total count. */
  getLatestCves(limit: number): Promise<CveHubData>;
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

/** Same page size as the app's KEV hub (client/src/pages/exploited-vulnerabilities.tsx). */
const KEV_PAGE_SIZE = 50;
/** Same page size as the app's directory (client/src/pages/threat-actors.tsx). */
const ACTORS_PAGE_SIZE = 20;
/** Articles written into /threatfeed (the app's first page shows 10; the extra ones add links). */
const FEED_SIZE = 20;
/** The newest CVEs written into /cve. The app pages through the rest client-side. */
const CVE_HUB_SIZE = 50;
const CVE_ID = /^CVE-\d{4}-\d{4,}$/;
// Listing pages that get a CollectionPage and breadcrumb.
const HUB_NAMES: Record<string, string> = {
  '/cve': 'Latest CVEs',
  '/cisa-kev': 'CISA KEV catalog',
  '/threat-actors': 'Threat actors',
  '/vendors': 'Vendors',
  '/cwe': 'Weaknesses (CWE)',
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

export async function resolvePageHead(rawPathname: string, data: PageData, search = ''): Promise<PageHead> {
  const pathname = rawPathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const segments = pathname.split('/').filter(Boolean);
  const [section, id] = segments;

  // Fixed pages with their own title and description.
  const fixed = STATIC_PAGE_META[pathname];
  if (pathname === '/' && fixed) {
    return {
      status: 200,
      title: fixed.title,
      description: fixed.description,
      canonical: canonicalFor('/'),
      jsonLd: landingJsonLd(),
      body: renderLandingBody(),
    };
  }
  if (fixed && segments.length <= 1) {
    const hubName = HUB_NAMES[pathname];
    let body: string | undefined;
    let kevPage = 1;
    if (pathname === '/cisa-kev') {
      const requested = parseInt(new URLSearchParams(search).get('page') ?? '1', 10);
      kevPage = Number.isFinite(requested) && requested > 1 ? requested : 1;
      const kev = await data.getKevPage(kevPage, KEV_PAGE_SIZE);
      body = renderKevHubBody(kev);
    } else if (pathname === '/threat-actors') {
      const requested = parseInt(new URLSearchParams(search).get('page') ?? '1', 10);
      body = renderActorsHubBody(await data.getActorsPage(Number.isFinite(requested) && requested > 1 ? requested : 1, ACTORS_PAGE_SIZE));
    } else if (pathname === '/cve') {
      body = renderCveHubBody(await data.getLatestCves(CVE_HUB_SIZE));
    } else if (pathname === '/threatfeed') {
      // Filtered and personal views (?source, ?search, ?view) differ from the default list, so they get no copy.
      const params = new URLSearchParams(search);
      if (!params.has('source') && !params.has('search') && !params.has('view')) {
        body = renderFeedBody(await data.getLatestArticles(FEED_SIZE));
      }
    } else if (pathname === '/vendors') {
      body = renderVendorsIndexBody(await data.getVendorIndex());
    } else if (pathname === '/cwe') {
      body = renderCweIndexBody(await data.getCweIndex());
    }
    return {
      status: 200,
      title: fixed.title,
      description: fixed.description,
      // The feed pages in the app, not by URL, so ?page=N is never a separate page.
      canonical: canonicalFor(pathname, pathname === '/threatfeed' ? '' : search),
      noindex: isNoindexPath(pathname),
      body,
      jsonLd: hubName
        ? hubJsonLd({
            path: pathname,
            name: hubName,
            title: fixed.title,
            description: fixed.description,
            // The FAQ is on the first page of the KEV catalog only.
            faq: pathname === '/cisa-kev' && kevPage === 1 ? KEV_FAQ : undefined,
          })
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

  // The CVSS calculators (WHA-29). ?vector=... only fills the form, so the canonical stays the plain page.
  if (segments.length === 2 && section === 'tools') {
    // The CVSS 4.0 calculator was briefly its own page; it is now a tab of the one calculator.
    if (pathname === CVSS4_LEGACY_PATH) return redirectTo(CVSS_TOOL_PATH);
    if (pathname !== CVSS_TOOL_PATH) return notFound('Tool Not Found | WhatCyber', 'This tool could not be found.');
    const meta = STATIC_PAGE_META[CVSS_TOOL_PATH];
    return {
      status: 200,
      title: meta.title,
      description: meta.description,
      canonical: canonicalFor(pathname),
      jsonLd: hubJsonLd({ path: pathname, name: 'CVSS calculator', title: meta.title, description: meta.description, faq: CVSS_FAQ }),
      body: renderCvssToolBody(),
    };
  }

  // Product pages: /vendors/<vendor>/<product>. Only products with enough KEV entries have a page.
  if (segments.length === 3 && section === 'vendors') {
    const productSlug = segments[2];
    if (id !== id.toLowerCase() || productSlug !== productSlug.toLowerCase()) {
      return redirectTo(productUrl(id.toLowerCase(), productSlug.toLowerCase()));
    }
    const hub = await data.getProductHub(id, productSlug);
    if (!hub) return notFound('Product Not Found | WhatCyber', 'This product page could not be found.');
    const seo = productSeo(hub);
    const parent = hub.vendorHub ? { name: hub.vendorHub.name, path: vendorUrl(hub.vendorHub.slug) } : { name: 'Vendors', path: VENDORS_HUB };
    return {
      status: 200,
      title: seo.title,
      description: seo.description,
      canonical: canonicalFor(pathname),
      jsonLd: hubJsonLd({
        path: productUrl(hub.vendorSlug, hub.productSlug),
        name: hub.productName,
        title: seo.title,
        description: seo.description,
        parent,
      }),
      body: renderProductHubBody(hub),
    };
  }

  // Vendor hubs: /vendors/<slug>. Only the top vendors have a page; anything else is a 404.
  if (segments.length === 2 && section === 'vendors') {
    if (id !== id.toLowerCase()) return redirectTo(vendorUrl(id.toLowerCase()));
    const hub = await data.getVendorHub(id);
    if (!hub) return notFound('Vendor Not Found | WhatCyber', 'This vendor page could not be found.');
    const seo = vendorSeo(hub);
    return {
      status: 200,
      title: seo.title,
      description: seo.description,
      canonical: canonicalFor(pathname),
      noindex: hub.cveCount < MIN_CVES_FOR_INDEX,
      jsonLd: hubJsonLd({
        path: vendorUrl(hub.slug),
        name: hub.name,
        title: seo.title,
        description: seo.description,
        parent: { name: 'Vendors', path: VENDORS_HUB },
      }),
      body: renderVendorHubBody(hub),
    };
  }

  // CWE hubs: /cwe/CWE-79. Only the top weaknesses have a page.
  if (segments.length === 2 && section === 'cwe') {
    if (!CWE_ID_PATTERN.test(id)) return notFound('Weakness Not Found | WhatCyber', 'This weakness page could not be found.');
    if (id !== id.toUpperCase()) return redirectTo(cweUrl(id));
    const hub = await data.getCweHub(id);
    if (!hub) return notFound('Weakness Not Found | WhatCyber', 'This weakness page could not be found.');
    const seo = cweSeo(hub);
    return {
      status: 200,
      title: seo.title,
      description: seo.description,
      canonical: canonicalFor(pathname),
      noindex: hub.cveCount < MIN_CVES_FOR_INDEX,
      jsonLd: hubJsonLd({
        path: cweUrl(hub.id),
        name: hub.id,
        title: seo.title,
        description: seo.description,
        parent: { name: 'Weaknesses', path: CWE_HUB },
      }),
      body: renderCweHubBody(hub),
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

    // WHA-23: a CVE outside the KEV catalog with no description or no references is thin. It stays out
    // of the index until it has them. When the stored text could not be read right now, it is not judged.
    const thin = !kev && Boolean(nvd) && nvd?.contentKnown !== false && (!nvd?.description || (nvd?.references ?? []).length === 0);

    return {
      status: 200,
      ...seo,
      noindex: thin || undefined,
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
