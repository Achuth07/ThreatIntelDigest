import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import { createClient } from '@sanity/client';
import { createImageUrlBuilder } from '@sanity/image-url';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, canonicalFor, isNoindexPath } from '../client/src/lib/seo-core.js';
import { UUID_PATTERN } from '../client/src/lib/urls.js';
import { injectHead } from '../server/services/head-inject.js';
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
    cachedShell = readFileSync(path.join(process.cwd(), 'dist', 'public', 'index.html'), 'utf8');
    return cachedShell;
  } catch {
    // Fall back to the static copy of the same file.
  }

  const response = await fetch(`https://${host}/index.html`);
  if (!response.ok) throw new Error(`Could not load index.html (${response.status})`);
  cachedShell = await response.text();
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
    async getKev(cveId) {
      const rows = await sql()`
        SELECT vendor_project, product, short_description
        FROM known_exploited_vulnerabilities WHERE cve_id = ${cveId}`;
      return (rows[0] as any) ?? null;
    },

    async getVulnerability(cveId) {
      const rows = await sql()`SELECT vendors, has_r2_backing FROM vulnerabilities WHERE id = ${cveId}`;
      const row = rows[0] as any;
      return row ? { vendors: row.vendors ?? [], hasR2Backing: Boolean(row.has_r2_backing) } : null;
    },

    async getVulnerabilityDescription(cveId) {
      try {
        const { fetchCveFromR2 } = await import('../server/services/r2.js');
        const record = await Promise.race([
          fetchCveFromR2(cveId),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
        ]);
        return typeof record?.description === 'string' ? record.description : '';
      } catch {
        return '';
      }
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

    async getPost(slug) {
      const post = await sanity.fetch(
        `*[_type == "post" && slug.current == $slug][0] { title, seoTitle, seoDescription, excerpt, mainImage }`,
        { slug }
      );
      if (!post) return null;
      return {
        title: post.title,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        excerpt: post.excerpt,
        imageUrl: post.mainImage ? imageBuilder.image(post.mainImage).width(1200).height(630).url() : null,
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
  const pathname = new URL(req.url!, `https://${req.headers.host}`).pathname;

  let shell: string;
  try {
    shell = await loadShell(req.headers.host);
  } catch (error) {
    console.error('Page shell unavailable:', error);
    return res.status(502).send('Temporarily unavailable');
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  try {
    const head = await resolvePageHead(pathname, createDataSource());
    if (head.status === 301 && head.redirect) {
      const search = new URL(req.url!, 'https://placeholder.invalid').search;
      res.setHeader('Cache-Control', CACHE.found);
      res.setHeader('Location', `${head.redirect}${search}`);
      return res.status(301).send('');
    }
    res.setHeader('Cache-Control', head.status === 404 ? CACHE.notFound : CACHE.found);
    return res.status(head.status).send(injectHead(shell, head));
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
