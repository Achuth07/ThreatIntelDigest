import { createClient } from '@sanity/client';
import { sql } from 'drizzle-orm';

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
export const SITEMAP_NAMES = ['core', 'blog', 'kev', 'actors'] as const;
export type SitemapName = (typeof SITEMAP_NAMES)[number];

type Entry = { path: string; lastmod?: Date | string | null };

// Only public, indexable pages. Login, register, password, settings, onboarding,
// watchlist, admin and /article pages are intentionally left out.
// Paths must match what client/src/components/seo.tsx emits as canonical.
const CORE_PATHS = [
  '/',
  '/threatfeed',
  '/vulnerabilities',
  '/exploited-vulnerabilities',
  '/threat-actors',
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

function sitemapIndex(): string {
  const body = SITEMAP_NAMES.map(
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
  if (!name) return sitemapIndex();
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
          .map((row) => ({ path: `/exploited-vulnerabilities/${row.cve_id}`, lastmod: row.lastmod }))
      );
    }

    case 'actors': {
      const db = await getDb();
      const rows = rowsOf(
        await db.execute(
          sql`SELECT id, COALESCE(last_updated, created_at) AS lastmod FROM threat_groups ORDER BY name`
        )
      );
      return urlset(rows.map((row) => ({ path: `/threat-actors/${row.id}`, lastmod: row.lastmod })));
    }
  }
}
