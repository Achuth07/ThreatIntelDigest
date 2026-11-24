import { createClient } from '@sanity/client';
import { sql } from 'drizzle-orm';
import { actorUrl, cveUrl, cweUrl, productUrl, vendorUrl } from '../../client/src/lib/urls.js';
import { CVE_SITEMAP_PAGE_SIZE, countTier2, getTier2Days, listTier2, type RawSql } from './cve-tier.js';

export const SITE_URL = 'https://www.whatcyber.com';

const sanity = createClient({
  projectId: '0odjb7zx',
  dataset: 'production',
  useCdn: true, // a sitemap does not need to be instant
  apiVersion: '2024-01-01',
});

/**
 * Child sitemaps, split by page type so indexing can be monitored per template.
 * CVE tiers (WHA-23) will be added here as separate files.
 */
export const SITEMAP_NAMES = ['core', 'blog', 'kev', 'actors', 'hubs'] as const;
export type SitemapName = (typeof SITEMAP_NAMES)[number];

type Entry = { path: string; lastmod?: Date | string | null };

// Only public, indexable pages. Login, register, password, settings, onboarding,
// watchlist, admin and /article pages are intentionally left out.
// Paths must match what client/src/components/seo.tsx emits as canonical.
const CORE_PATHS = [
  '/',
  '/threatfeed',
  '/cve',
  '/cisa-kev',
  '/threat-actors',
  '/vendors',
  '/cwe',
  '/tools/cvss-calculator',
  '/tools/cvss-calculator/4-0',
  '/tools/cvss-calculator/3-1',
  '/tools/kev-exposure-checker',
  '/blog',
  '/about',
  '/sources',
  '/contact',
  '/privacy',
  '/terms',
];

const CVE_ID = /^CVE-\d{4}-\d{4,}$/;

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

function toIso(value?: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function urlset(entries: Entry[]): string {
  const body = entries
    .map(({ path, lastmod }) => {
      const iso = toIso(lastmod);
      return `  <url>\n    <loc>${escapeXml(`${SITE_URL}${path}`)}</loc>${iso ? `\n    <lastmod>${iso}</lastmod>` : ''}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/**
 * The tier 2 CVE sitemaps (WHA-23): sitemap-cve-1.xml, sitemap-cve-2.xml, ... Empty while tier 2 is off.
 * They are not in SITEMAP_NAMES because how many there are depends on the data.
 */
async function tier2Sql(): Promise<RawSql | null> {
  if (!process.env.DATABASE_URL) return null;
  const { neon } = await import('@neondatabase/serverless');
  return neon(process.env.DATABASE_URL) as unknown as RawSql;
}

async function tier2Files(): Promise<number> {
  const query = await tier2Sql();
  if (!query) return 0;
  const days = await getTier2Days(query);
  if (!days) return 0;
  return Math.ceil((await countTier2(query, days)) / CVE_SITEMAP_PAGE_SIZE);
}

function sitemapIndex(extraNames: string[] = []): string {
  const body = [...SITEMAP_NAMES, ...extraNames].map(
    (name) => `  <sitemap>\n    <loc>${SITE_URL}/sitemap-${name}.xml</loc>\n  </sitemap>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

// drizzle's neon driver returns { rows }, other drivers return the array itself
const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows ?? []);

/**
 * Returns the XML for `/sitemap.xml` (name undefined) or `/sitemap-<name>.xml`,
 * or null when the name is not a known sitemap. Errors are thrown so callers can
 * answer 5xx instead of serving an empty sitemap that crawlers would trust.
 */
export async function renderSitemap(
  name: string | undefined,
  getDb: () => Promise<any> | any
): Promise<string | null> {
  if (!name) {
    const files = await tier2Files();
    return sitemapIndex(Array.from({ length: files }, (_, i) => `cve-${i + 1}`));
  }

  const cvePage = name.match(/^cve-([1-9]\d{0,2})$/);
  if (cvePage) {
    const query = await tier2Sql();
    const days = query ? await getTier2Days(query) : 0;
    if (!query || !days) return null;
    const page = Number(cvePage[1]);
    const rows = await listTier2(query, days, CVE_SITEMAP_PAGE_SIZE, (page - 1) * CVE_SITEMAP_PAGE_SIZE);
    if (!rows.length) return null;
    return urlset(rows.filter((row) => CVE_ID.test(row.id)).map((row) => ({ path: cveUrl(row.id), lastmod: row.lastmod })));
  }

  if (!(SITEMAP_NAMES as readonly string[]).includes(name)) return null;

  switch (name as SitemapName) {
    case 'core':
      return urlset(CORE_PATHS.map((path) => ({ path })));

    case 'blog': {
      const posts: { slug?: string; publishedAt?: string; _updatedAt?: string }[] =
        await sanity.fetch(`*[_type == "post" && defined(slug.current)] { "slug": slug.current, publishedAt, _updatedAt }`);
      return urlset(
        posts.map((post) => ({
          path: `/blog/${encodeURIComponent(post.slug!)}`,
          lastmod: post._updatedAt || post.publishedAt,
        }))
      );
    }

    case 'kev': {
      const db = await getDb();
      const rows = rowsOf(
        await db.execute(
          // date_added, not updated_at: the daily KEV sync touches every row, which would stamp
          // all entries with today's date and teach crawlers to ignore lastmod.
          sql`SELECT cve_id, date_added AS lastmod FROM known_exploited_vulnerabilities ORDER BY date_added DESC`
        )
      );
      return urlset(
        rows
          .filter((row) => CVE_ID.test(row.cve_id))
          .map((row) => ({ path: cveUrl(row.cve_id), lastmod: row.lastmod }))
      );
    }

    case 'hubs': {
      // The vendor and weakness pages (WHA-24): only those in the stats tables exist as pages.
      const db = await getDb();
      const vendors = rowsOf(await db.execute(sql`SELECT slug, updated_at AS lastmod FROM vendor_stats ORDER BY rank`));
      const cwes = rowsOf(await db.execute(sql`SELECT id, updated_at AS lastmod FROM cwe_stats ORDER BY rank`));
      const products = rowsOf(await db.execute(sql`SELECT vendor_slug, product_slug, updated_at AS lastmod FROM product_stats ORDER BY rank`));
      return urlset([
        ...vendors.map((row) => ({ path: vendorUrl(row.slug), lastmod: row.lastmod })),
        ...products.map((row) => ({ path: productUrl(row.vendor_slug, row.product_slug), lastmod: row.lastmod })),
        ...cwes.map((row) => ({ path: cweUrl(row.id), lastmod: row.lastmod })),
      ]);
    }

    case 'actors': {
      const db = await getDb();
      const rows = rowsOf(
        await db.execute(
          // Only groups with a slug: the slug is their one public address.
          sql`SELECT slug, COALESCE(last_updated, created_at) AS lastmod FROM threat_groups WHERE slug IS NOT NULL ORDER BY name`
        )
      );
      return urlset(rows.map((row) => ({ path: actorUrl({ id: '', slug: row.slug }), lastmod: row.lastmod })));
    }
  }
}
