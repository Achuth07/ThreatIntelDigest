import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, canonicalFor, isNoindexPath } from '../client/src/lib/seo-core.js';
import { UUID_PATTERN } from '../client/src/lib/urls.js';
import { actorSnippet, publishedProfile, showDrafts, type ActorFacts } from '../client/src/lib/actor-profile.js';
import { injectHead } from '../server/services/head-inject.js';
import { getCweHub, getCweIndex, getProductHub, getHubCweIds, getHubVendorSlugs, getVendorHub, getVendorIndex } from '../server/services/hub-data.js';
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

  return {
    async getCve(cveId) {
      const query = sql();
      const [kevRows, vulnRows, actorRows] = await Promise.all([
        query`SELECT vendor_project, product, vulnerability_name, date_added, short_description, required_action, due_date,
                     known_ransomware_campaign_use, notes
              FROM known_exploited_vulnerabilities WHERE cve_id = ${cveId}`,
        query`SELECT published_date, last_modified_date, vuln_status, cvss_v3_score, cvss_v3_severity, cvss_v2_score,
                     cvss_v2_severity, cvss_vector, epss_score, weaknesses, vendors, has_r2_backing
              FROM vulnerabilities WHERE id = ${cveId}`,
        // Threat actors named in the news articles that name this CVE (an inference, labelled as such).
        query`SELECT tg.id, tg.slug, tg.name, count(DISTINCT ac.article_url)::int AS mentions
              FROM article_cves ac
              JOIN article_threat_groups atg ON atg.article_id = ac.article_id
              JOIN threat_groups tg ON tg.id = atg.threat_group_id
              WHERE ac.cve_id = ${cveId}
              GROUP BY tg.id, tg.slug, tg.name
              ORDER BY mentions DESC, tg.name
              LIMIT 8`.catch(() => []),
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

      // Links to the vendor and weakness hubs that exist for this CVE (WHA-24). Best effort.
      const vendorList = list(v?.vendors) as string[];
      const weaknessList = (list(v?.weaknesses).length ? list(v?.weaknesses) : list(stored?.weaknesses)) as string[];
      const [vendorHubs, cweHubIds] = await Promise.all([
        getHubVendorSlugs(query, vendorList.slice(0, 5)).catch(() => []),
        getHubCweIds(query, weaknessList).catch(() => []),
      ]);

      return {
        id: cveId,
        vendorHubs,
        cweHubIds,
        actors: (actorRows as any[]).map((a) => ({ id: a.id, slug: a.slug ?? null, name: a.name })),
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
              epssScore: num(v.epss_score),
              weaknesses: list(v.weaknesses).length ? list(v.weaknesses) : list(stored?.weaknesses),
              vendors: list(v.vendors),
              // False when the stored text should exist but could not be read (timeout); then the page
              // is not judged by its text (WHA-23).
              contentKnown: !v?.has_r2_backing || stored !== null,
              description: typeof stored?.description === 'string' ? stored.description : '',
              affectedProducts: list(stored?.affectedProducts),
              references: list(stored?.references).length ? list(stored?.references) : list(stored?.referenceUrls),
            }
          : null,
      };
    },

    async getActor(idOrSlug) {
      const isId = UUID_PATTERN.test(idOrSlug);
      let base: any = null;
      try {
        const rows = isId
          ? await sql()`SELECT id, slug, name, aliases, description FROM threat_groups WHERE id = ${idOrSlug}`
          : await sql()`SELECT id, slug, name, aliases, description FROM threat_groups WHERE slug = ${idOrSlug}`;
        base = rows[0] ?? null;
      } catch (error) {
        // The slug column may not exist yet (migration 005 not run). Old id-based links still work.
        if (!isId) throw error;
        const rows = await sql()`SELECT id, name, aliases, description FROM threat_groups WHERE id = ${idOrSlug}`;
        base = rows[0] ? { ...rows[0], slug: null } : null;
      }
      if (!base) return null;

      // What MITRE ATT&CK and our news links say about the actor (WHA-55, WHA-20). Each part is optional:
      // if a table is missing or slow, the page still renders with the name, aliases and description.
      const query = sql();
      const part = async <T>(run: () => Promise<T>, fallback: T): Promise<T> => {
        try {
          return await run();
        } catch {
          return fallback;
        }
      };
      const [attack, techniques, software, cves, articles] = await Promise.all([
        part(() => query`SELECT attack_id FROM threat_groups WHERE id = ${base.id}`, [] as any[]),
        part(
          () => query`SELECT t.attack_id, t.name, t.tactics, t.is_subtechnique
                      FROM actor_techniques at JOIN attack_techniques t ON t.stix_id = at.technique_stix_id
                      WHERE at.threat_group_id = ${base.id} ORDER BY t.attack_id`,
          [] as any[],
        ),
        part(
          () => query`SELECT s.name, s.software_type FROM actor_software asw JOIN attack_software s ON s.stix_id = asw.software_stix_id
                      WHERE asw.threat_group_id = ${base.id} ORDER BY s.name`,
          [] as any[],
        ),
        part(
          () => query`SELECT DISTINCT ON (c.cve_id) c.cve_id, c.confidence, (k.cve_id IS NOT NULL) AS in_kev, v.cvss_v3_score
                      FROM actor_cves c
                      LEFT JOIN known_exploited_vulnerabilities k ON k.cve_id = c.cve_id
                      LEFT JOIN vulnerabilities v ON v.id = c.cve_id
                      WHERE c.threat_group_id = ${base.id}
                      ORDER BY c.cve_id, CASE c.confidence WHEN 'high' THEN 0 ELSE 1 END`,
          [] as any[],
        ),
        part(
          () => query`SELECT a.title, a.source, a.published_at FROM article_threat_groups atg JOIN articles a ON a.id = atg.article_id
                      WHERE atg.threat_group_id = ${base.id} ORDER BY a.published_at DESC LIMIT 5`,
          [] as any[],
        ),
      ]);

      return {
        ...base,
        attackId: (attack[0] as any)?.attack_id ?? null,
        techniques: (techniques as any[]).map((r) => ({ attackId: r.attack_id, name: r.name, tactics: Array.isArray(r.tactics) ? r.tactics : [], isSubtechnique: !!r.is_subtechnique })),
        software: (software as any[]).map((r) => ({ name: r.name, type: r.software_type })),
        cves: (cves as any[])
          .map((r) => ({ cveId: r.cve_id, confidence: r.confidence, inKev: !!r.in_kev, cvssScore: r.cvss_v3_score == null ? null : Number(r.cvss_v3_score) }))
          .sort((a, b) => (a.confidence === b.confidence ? b.cveId.localeCompare(a.cveId) : a.confidence === 'high' ? -1 : 1)),
        articles: (articles as any[]).map((r) => ({ title: r.title, source: r.source, publishedAt: r.published_at })),
      };
    },

    async getKevPage(page, pageSize) {
      const query = sql();
      const [countRows, vendorRows, rows] = await Promise.all([
        query`SELECT count(*)::int AS total FROM known_exploited_vulnerabilities`,
        query`SELECT vendor_project, count(*)::int AS count FROM known_exploited_vulnerabilities
              GROUP BY vendor_project ORDER BY count DESC, vendor_project LIMIT 10`,
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
        topVendors: (vendorRows as any[]).map((v) => ({ vendor: v.vendor_project, count: Number(v.count) })),
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

    async getActorsPage(page, pageSize) {
      const query = sql();
      const [countRows, rows] = await Promise.all([
        query`SELECT count(*)::int AS total, max(last_updated) AS latest FROM threat_groups`,
        query`SELECT id, slug, name, aliases, description FROM threat_groups
              ORDER BY last_updated DESC NULLS LAST, name
              LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      ]);
      const total = Number((countRows[0] as any)?.total ?? 0);

      // A short line per actor from its written profile or its own ATT&CK data, not MITRE's description
      // (WHA-20). If the extra queries fail, the entries keep MITRE's text and the page still renders.
      let entries = rows as any[];
      try {
        const ids = entries.map((r) => r.id);
        const [techRows, softwareRows, cveRows] = await Promise.all([
          query`SELECT at.threat_group_id AS gid, t.tactics, t.is_subtechnique
                FROM actor_techniques at JOIN attack_techniques t ON t.stix_id = at.technique_stix_id
                WHERE at.threat_group_id = ANY(${ids}::uuid[])`,
          query`SELECT asw.threat_group_id AS gid, s.name, s.software_type
                FROM actor_software asw JOIN attack_software s ON s.stix_id = asw.software_stix_id
                WHERE asw.threat_group_id = ANY(${ids}::uuid[]) ORDER BY s.name`,
          query`SELECT DISTINCT ON (c.threat_group_id, c.cve_id) c.threat_group_id AS gid, c.cve_id, c.confidence, (k.cve_id IS NOT NULL) AS in_kev
                FROM actor_cves c LEFT JOIN known_exploited_vulnerabilities k ON k.cve_id = c.cve_id
                WHERE c.threat_group_id = ANY(${ids}::uuid[])
                ORDER BY c.threat_group_id, c.cve_id, CASE c.confidence WHEN 'high' THEN 0 ELSE 1 END`,
        ]);
        const by = <T extends { gid: string }>(list: any[]) => {
          const map = new Map<string, T[]>();
          for (const row of list) map.set(row.gid, [...(map.get(row.gid) ?? []), row]);
          return map;
        };
        const techByActor = by(techRows as any[]);
        const softwareByActor = by(softwareRows as any[]);
        const cveByActor = by(cveRows as any[]);
        const drafts = showDrafts(process.env.VERCEL_ENV);
        entries = entries.map((r) => {
          const facts: ActorFacts = {
            name: r.name,
            attackId: null,
            aliases: r.aliases ?? [],
            techniques: (techByActor.get(r.id) ?? []).map((t: any) => ({ attackId: '', name: '', tactics: Array.isArray(t.tactics) ? t.tactics : [], isSubtechnique: !!t.is_subtechnique })),
            software: (softwareByActor.get(r.id) ?? []).map((s: any) => ({ name: s.name, type: s.software_type })),
            cves: (cveByActor.get(r.id) ?? []).map((c: any) => ({ cveId: c.cve_id, confidence: c.confidence, inKev: !!c.in_kev })),
          };
          return { ...r, snippet: actorSnippet(publishedProfile(r.slug, drafts), facts) || null };
        });
      } catch {
        /* keep MITRE's text for this page */
      }
      return { page, total, latest: (countRows[0] as any)?.latest ?? null, totalPages: Math.max(1, Math.ceil(total / pageSize)), entries };
    },

    async getLatestCves(limit) {
      const query = sql();
      const [countRows, rows] = await Promise.all([
        query`SELECT count(*)::int AS total FROM vulnerabilities`,
        query`SELECT id, published_date, cvss_v3_severity, cvss_v3_score, vendors
              FROM vulnerabilities ORDER BY published_date DESC, id DESC LIMIT ${limit}`,
      ]);
      return {
        total: Number((countRows[0] as any)?.total ?? 0),
        entries: (rows as any[]).map((r) => ({
          id: r.id,
          publishedDate: r.published_date,
          severity: r.cvss_v3_severity,
          score: r.cvss_v3_score === null || r.cvss_v3_score === undefined ? null : Number(r.cvss_v3_score),
          vendors: Array.isArray(r.vendors) ? r.vendors : [],
        })),
      };
    },

    async getLatestArticles(limit) {
      const rows = await sql()`SELECT title, summary, url, source, threat_level, published_at FROM articles
                               ORDER BY published_at DESC LIMIT ${limit}`;
      return (rows as any[]).map((r) => ({
        title: r.title,
        summary: r.summary,
        url: r.url,
        source: r.source,
        threatLevel: r.threat_level ?? null,
        publishedAt: r.published_at,
      }));
    },

    async getVendorIndex() {
      return getVendorIndex(sql());
    },
    async getCweIndex() {
      return getCweIndex(sql());
    },
    async getVendorHub(slug) {
      return getVendorHub(sql(), slug);
    },
    async getCweHub(id) {
      return getCweHub(sql(), id);
    },
    async getProductHub(vendor, product) {
      return getProductHub(sql(), vendor, product);
    },

    async getPost(slug) {
      // Loaded here, not at the top: only blog posts need the CMS client, and importing it costs
      // 200 to 500 ms of cold start that every other page would pay.
      const [{ createClient }, { createImageUrlBuilder }] = await Promise.all([import('@sanity/client'), import('@sanity/image-url')]);
      const sanity = createClient({
        projectId: '0odjb7zx',
        dataset: 'production',
        useCdn: true,
        apiVersion: '2024-01-01',
      });
      const imageBuilder = createImageUrlBuilder(sanity);
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
  // The visitor's own query keys that change what a page shows (the rewrite adds others, which are not passed on).
  const searchParams = new URLSearchParams();
  for (const key of ['page', 'source', 'search', 'view']) {
    const value = requestUrl.searchParams.get(key);
    if (value !== null) searchParams.set(key, value);
  }
  const search = `?${searchParams.toString()}`;

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
      // /cve/:id to this function (route, section, id, vendor, product, tool and variant).
      const query = new URL(req.url!, 'https://placeholder.invalid').searchParams;
      query.delete('route');
      query.delete('vendor');
      query.delete('product');
      query.delete('section');
      query.delete('id');
      query.delete('tool');
      query.delete('variant');
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
