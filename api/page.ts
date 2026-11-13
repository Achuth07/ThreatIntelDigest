import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import { createClient } from '@sanity/client';
import { createImageUrlBuilder } from '@sanity/image-url';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, canonicalFor, isNoindexPath } from '../client/src/lib/seo-core.js';
import { UUID_PATTERN } from '../client/src/lib/urls.js';
import { injectHead } from '../server/services/head-inject.js';
import { injectBody, stripBody } from '../server/services/page-body.js';
import { resolvePageHead, type PageData } from '../server/services/page-head.js';

/**
 * Serves the app's HTML for public pages with the right <head> tags for the URL requested, and a
 * real 404 for records that do not exist. vercel.json routes the page URLs here; the browser then
 * loads the same React app as before.
 *
 * Whatever goes wrong with the data (database or CMS down), the page must still load, so the failure
 * falls back to the app with neutral tags for the URL, status 200, and is never cached.
 */

let cachedShell: string | null = null;

async function loadShell(host: string | undefined): Promise<string> {
  if (cachedShell) return cachedShell;

  // The build output is bundled into this function (includeFiles in vercel.json).
  try {
    // index.html carries the landing page copy; other pages start from the bare shell.
    cachedShell = stripBody(readFileSync(path.join(process.cwd(), 'dist', 'public', 'index.html'), 'utf8'));
    return cachedShell;
  } catch {
    // Fall back to the static copy of the same file.
  }

  const response = await fetch(`https://${host}/index.html`);
  if (!response.ok) throw new Error(`Could not load index.html (${response.status})`);
  cachedShell = stripBody(await response.text());
  return cachedShell;
}

function createDataSource(): PageData {
  const sql = () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
    return neon(process.env.DATABASE_URL);
  };

  const sanity = createClient({
    projectId: '0odjb7zx',
    dataset: 'production',
    useCdn: true,
    apiVersion: '2024-01-01',
  });
  const imageBuilder = createImageUrlBuilder(sanity);

  return {
    async getCve(cveId) {
      const query = sql();
      const [kevRows, vulnRows] = await Promise.all([
        query`SELECT vendor_project, product, vulnerability_name, date_added, short_description, required_action, due_date,
                     known_ransomware_campaign_use, notes
              FROM known_exploited_vulnerabilities WHERE cve_id = ${cveId}`,
        query`SELECT published_date, last_modified_date, vuln_status, cvss_v3_score, cvss_v3_severity, cvss_v2_score,
                     cvss_v2_severity, cvss_vector, weaknesses, vendors, has_r2_backing
              FROM vulnerabilities WHERE id = ${cveId}`,
      ]);
      const k = kevRows[0] as any;
      const v = vulnRows[0] as any;
      if (!k && !v) return null;

      // The description, references and product list of many CVEs live in storage, not the database.
      let stored: any = null;
      if (v?.has_r2_backing) {
        try {
          const { fetchCveFromR2 } = await import('../server/services/r2.js');
          stored = await Promise.race([
            fetchCveFromR2(cveId),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
          ]);
        } catch {
          stored = null;
        }
      }

      const num = (value: unknown) => (value === null || value === undefined || value === '' ? null : Number(value));
      const list = (value: unknown) => (Array.isArray(value) ? value : []);

      return {
        id: cveId,
        kev: k
          ? {
              vendorProject: k.vendor_project,
              product: k.product,
              vulnerabilityName: k.vulnerability_name,
              dateAdded: k.date_added,
              shortDescription: k.short_description,
              requiredAction: k.required_action,
              dueDate: k.due_date,
              knownRansomwareCampaignUse: k.known_ransomware_campaign_use,
              notes: k.notes,
            }
          : null,
        nvd: v
          ? {
              publishedDate: v.published_date,
              lastModifiedDate: v.last_modified_date,
              status: v.vuln_status ?? null,
              cvssV3Score: num(stored?.cvssV3Score ?? v.cvss_v3_score),
              cvssV3Severity: stored?.cvssV3Severity ?? v.cvss_v3_severity ?? null,
              cvssV2Score: num(stored?.cvssV2Score ?? v.cvss_v2_score),
              cvssV2Severity: stored?.cvssV2Severity ?? v.cvss_v2_severity ?? null,
              cvssVector: stored?.cvssVector ?? stored?.cvss_vector ?? v.cvss_vector ?? null,
              weaknesses: list(v.weaknesses).length ? list(v.weaknesses) : list(stored?.weaknesses),
              vendors: list(v.vendors),
              description: typeof stored?.description === 'string' ? stored.description : '',
              affectedProducts: list(stored?.affectedProducts),
              references: list(stored?.references).length ? list(stored?.references) : list(stored?.referenceUrls),
            }
          : null,
      };
    },

    async getActor(idOrSlug) {
      const isId = UUID_PATTERN.test(idOrSlug);
      try {
        const rows = isId
          ? await sql()`SELECT id, slug, name, aliases, description FROM threat_groups WHERE id = ${idOrSlug}`
          : await sql()`SELECT id, slug, name, aliases, description FROM threat_groups WHERE slug = ${idOrSlug}`;
        return (rows[0] as any) ?? null;
      } catch (error) {
        // The slug column may not exist yet (migration 005 not run). Old id-based links still work.
        if (!isId) throw error;
        const rows = await sql()`SELECT id, name, aliases, description FROM threat_groups WHERE id = ${idOrSlug}`;
        return rows[0] ? ({ ...rows[0], slug: null } as any) : null;
      }
    },

    async getKevPage(page, pageSize) {
      const query = sql();
      const [countRows, rows] = await Promise.all([
        query`SELECT count(*)::int AS total FROM known_exploited_vulnerabilities`,
        query`SELECT cve_id, vendor_project, product, vulnerability_name, date_added, short_description,
                     known_ransomware_campaign_use
              FROM known_exploited_vulnerabilities
              ORDER BY date_added DESC
              LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      ]);
      const total = Number((countRows[0] as any)?.total ?? 0);
      return {
        page,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        entries: (rows as any[]).map((r) => ({
          cveId: r.cve_id,
          vendorProject: r.vendor_project,
          product: r.product,
          vulnerabilityName: r.vulnerability_name,
          dateAdded: r.date_added,
          shortDescription: r.short_description,
          knownRansomwareCampaignUse: r.known_ransomware_campaign_use,
        })),
      };
    },

    async getPost(slug) {
      const post = await sanity.fetch(
        `*[_type == "post" && slug.current == $slug][0] { title, seoTitle, seoDescription, excerpt, mainImage, publishedAt, _updatedAt, "authorName": author->name }`,
        { slug }
      );
      if (!post) return null;
      return {
        title: post.title,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        excerpt: post.excerpt,
        imageUrl: post.mainImage ? imageBuilder.image(post.mainImage).width(1200).height(630).url() : null,
        publishedAt: post.publishedAt,
        updatedAt: post._updatedAt,
        authorName: post.authorName,
      };
    },
  };
}

const CACHE = {
  found: 'public, s-maxage=3600, stale-while-revalidate=86400',
  notFound: 'public, s-maxage=60',
  fallback: 'no-store',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestUrl = new URL(req.url!, `https://${req.headers.host}`);
  const pathname = requestUrl.pathname;
  const search = `?page=${requestUrl.searchParams.get('page') ?? ''}`;

  let shell: string;
  try {
    shell = await loadShell(req.headers.host);
  } catch (error) {
    console.error('Page shell unavailable:', error);
    return res.status(502).send('Temporarily unavailable');
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  try {
    const head = await resolvePageHead(pathname, createDataSource(), search);
    if (head.status === 301 && head.redirect) {
      // Keep the visitor's own query string, but not the parameters Vercel adds when it rewrites
      // /cve/:id to this function (section and id).
      const query = new URL(req.url!, 'https://placeholder.invalid').searchParams;
      query.delete('section');
      query.delete('id');
      const search = query.toString();
      res.setHeader('Cache-Control', CACHE.found);
      res.setHeader('Location', `${head.redirect}${search ? `?${search}` : ''}`);
      return res.status(301).send('');
    }
    res.setHeader('Cache-Control', head.status === 404 ? CACHE.notFound : CACHE.found);
    const html = injectHead(shell, head);
    return res.status(head.status).send(head.body ? injectBody(html, head.body) : html);
  } catch (error) {
    // Database or CMS problem: serve the app with neutral tags for this URL (the shell itself carries
    // the landing page's tags, which would be wrong here), and do not cache the answer.
    console.error(`Head tags unavailable for ${pathname}:`, error);
    res.setHeader('Cache-Control', CACHE.fallback);
    return res.status(200).send(
      injectHead(shell, {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        canonical: canonicalFor(pathname),
        noindex: isNoindexPath(pathname),
      })
    );
  }
}
