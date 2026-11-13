/**
 * Server-rendered page content (WHA-17 phase 2).
 *
 * Builds the readable body of a public page as plain HTML, so crawlers and AI bots that do not run
 * JavaScript see the real content, and visitors see text straight away on a slow connection. The
 * React app then loads, builds the full interactive page, and replaces this block (see
 * client/src/lib/ssr-handoff.ts). Pure string work over data passed in, so it needs no database.
 *
 * Keep this in step with what the pages show: same facts, simpler layout.
 */

import { ACTORS_HUB, CVE_HUB, KEV_HUB, cveUrl } from '../../client/src/lib/urls.js';
import { LANDING_FAQ } from '../../client/src/lib/jsonld.js';
import { pageList } from '../../client/src/lib/page-list.js';

const esc = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Only http(s) links are written out as links; anything else is text. */
const safeUrl = (value: unknown) => {
  const url = String(value ?? '').trim();
  return /^https?:\/\//i.test(url) ? url : null;
};

const formatDate = (value: unknown) => {
  if (!value) return '';
  const date = new Date(value as any);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

/** MITRE descriptions carry markdown links and "(Citation: ...)" markers; show plain text. */
const plain = (text: unknown) =>
  String(text ?? '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\(Citation: [^)]+\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const NAV = [
  { href: '/threatfeed', label: 'Threat feed' },
  { href: CVE_HUB, label: 'Latest CVEs' },
  { href: KEV_HUB, label: 'CISA KEV catalog' },
  { href: ACTORS_HUB, label: 'Threat actors' },
  { href: '/blog', label: 'Blog' },
];

// Dark page that matches the app, so the brief moment before the app takes over looks right. While
// this block is on screen the empty app container is parked off-screen (it still lays out normally).
// Once the app takes over, the block is hidden (not removed), see client/src/lib/ssr-handoff.ts.
const STYLE = `
#ssr-content{min-height:100vh;background:#0b1220;color:#cbd5e1;font:16px/1.6 Inter,system-ui,-apple-system,sans-serif}
#ssr-content a{color:#2dd4bf}
#ssr-content header{border-bottom:1px solid #1e293b;padding:14px 20px;display:flex;flex-wrap:wrap;gap:8px 20px;align-items:center}
#ssr-content header strong{color:#f1f5f9;font-size:18px;margin-right:12px}
#ssr-content main{max-width:960px;margin:0 auto;padding:24px 20px 56px}
#ssr-content h1{color:#f1f5f9;font-size:30px;line-height:1.25;margin:8px 0 6px}
#ssr-content h2{color:#f1f5f9;font-size:20px;margin:28px 0 8px;border-bottom:1px solid #1e293b;padding-bottom:6px}
#ssr-content h3{color:#e2e8f0;font-size:17px;margin:18px 0 4px}
#ssr-content ul{padding-left:20px}
#ssr-content li{margin:4px 0}
#ssr-content dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 18px;margin:8px 0}
#ssr-content dt{color:#94a3b8}
#ssr-content .crumbs{font-size:14px;color:#94a3b8}
#ssr-content .tag{display:inline-block;border:1px solid #475569;border-radius:999px;padding:1px 10px;font-size:13px;margin-right:6px;color:#e2e8f0}
#ssr-content .warn{border-color:#ef4444;color:#fca5a5}
#ssr-content footer{border-top:1px solid #1e293b;padding:16px 20px;font-size:14px;color:#94a3b8}
#ssr-content:not([data-handed-off]) ~ #root{position:absolute;left:-99999px;top:0;width:100%}
#ssr-content[data-handed-off]{visibility:hidden;position:absolute;left:-99999px;top:0;height:0;min-height:0;overflow:hidden}
`.replace(/\n/g, '');

function shell(title: string, inner: string): string {
  return `<div id="ssr-content"><style>${STYLE}</style>
<header><strong>WhatCyber</strong><nav>${NAV.map((n) => `<a href="${esc(n.href)}">${esc(n.label)}</a>`).join(' &middot; ')}</nav></header>
<main>${inner}</main>
<footer>WhatCyber threat intelligence &middot; <a href="/about">About</a> &middot; <a href="/sources">Sources</a> &middot; <a href="/privacy">Privacy</a> &middot; <a href="/terms">Terms</a> &middot; <a href="/contact">Contact</a></footer>
</div>`;
}

// ---------------------------------------------------------------------------------------------
// CVE detail

export interface CveBodyData {
  id: string;
  kev: {
    vendorProject: string;
    product: string;
    vulnerabilityName: string;
    dateAdded: unknown;
    shortDescription: string;
    requiredAction: string;
    dueDate: unknown;
    knownRansomwareCampaignUse: string | null;
    notes: string | null;
  } | null;
  nvd: {
    publishedDate: unknown;
    lastModifiedDate: unknown;
    status: string | null;
    cvssV3Score: number | null;
    cvssV3Severity: string | null;
    cvssV2Score: number | null;
    cvssV2Severity: string | null;
    cvssVector: string | null;
    weaknesses: string[];
    vendors: string[];
    description: string;
    affectedProducts: { vendor?: string; product?: string; versions?: string[] }[];
    references: { url?: string; source?: string }[];
  } | null;
}

export function renderCveBody(data: CveBodyData): string {
  const { id, kev, nvd } = data;
  const vendor = kev?.vendorProject || (nvd?.vendors?.length ? nvd.vendors.join(', ') : '');
  const product = kev?.product || '';
  const description = plain(kev?.shortDescription || nvd?.description || '');

  const tags: string[] = [];
  if (kev) tags.push('<span class="tag warn">Actively exploited (CISA KEV)</span>');
  if (kev?.knownRansomwareCampaignUse === 'Known') tags.push('<span class="tag warn">Ransomware linked</span>');
  if (nvd?.cvssV3Severity) tags.push(`<span class="tag">${esc(nvd.cvssV3Severity)} severity</span>`);

  const facts: [string, string][] = [];
  if (nvd?.cvssV3Score != null) facts.push(['CVSS v3', `${nvd.cvssV3Score}${nvd.cvssV3Severity ? ` (${nvd.cvssV3Severity})` : ''}`]);
  if (nvd?.cvssV2Score != null) facts.push(['CVSS v2', `${nvd.cvssV2Score}${nvd.cvssV2Severity ? ` (${nvd.cvssV2Severity})` : ''}`]);
  if (nvd?.cvssVector) facts.push(['CVSS vector', nvd.cvssVector]);
  if (nvd?.publishedDate) facts.push(['Published', formatDate(nvd.publishedDate)]);
  if (nvd?.lastModifiedDate) facts.push(['Last modified', formatDate(nvd.lastModifiedDate)]);
  if (nvd?.status) facts.push(['NVD status', nvd.status]);
  if (kev?.dateAdded) facts.push(['Added to CISA KEV', formatDate(kev.dateAdded)]);
  if (kev?.dueDate) facts.push(['CISA due date', formatDate(kev.dueDate)]);

  const allProducts = nvd?.affectedProducts ?? [];
  const products = allProducts.slice(0, 20);
  const moreProducts = allProducts.length - products.length;
  const references = (nvd?.references ?? []).filter((r) => safeUrl(r?.url)).slice(0, 15);

  const inner = `
<p class="crumbs"><a href="/">WhatCyber</a> / <a href="${esc(kev ? KEV_HUB : CVE_HUB)}">${kev ? 'CISA KEV catalog' : 'Vulnerabilities'}</a> / ${esc(id)}</p>
<h1>${esc(id)}${vendor || product ? `: ${esc([vendor, product].filter(Boolean).join(' '))}` : ''}</h1>
${kev?.vulnerabilityName ? `<p>${esc(kev.vulnerabilityName)}</p>` : ''}
<p>${tags.join(' ')}</p>
${description ? `<h2>Description</h2><p>${esc(description)}</p>` : ''}
${facts.length ? `<h2>Key facts</h2><dl>${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
${kev?.requiredAction ? `<h2>Required action</h2><p>${esc(plain(kev.requiredAction))}</p>` : ''}
${kev?.notes ? `<p>${esc(plain(kev.notes))}</p>` : ''}
${nvd?.weaknesses?.length ? `<h2>Weaknesses (CWE)</h2><ul>${nvd.weaknesses.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
${products.length ? `<h2>Affected products</h2><ul>${products.map((p) => { const versions = (p.versions ?? []).filter((v) => v && v !== '-' && v !== '*').slice(0, 12); return `<li>${esc([p.vendor, p.product].filter(Boolean).join(' '))}${versions.length ? ` (versions: ${esc(versions.join(', '))})` : ''}</li>`; }).join('')}${moreProducts > 0 ? `<li>and ${moreProducts} more</li>` : ''}</ul>` : nvd?.vendors?.length ? `<h2>Affected vendors</h2><p>${esc(nvd.vendors.join(', '))}</p>` : ''}
${references.length ? `<h2>References</h2><ul>${references.map((r) => `<li><a href="${esc(safeUrl(r.url))}" rel="nofollow noopener">${esc(r.url)}</a></li>`).join('')}</ul>` : ''}
<h2>More on WhatCyber</h2>
<ul><li><a href="${esc(CVE_HUB)}">Latest CVEs</a></li><li><a href="${esc(KEV_HUB)}">CISA Known Exploited Vulnerabilities catalog</a></li><li><a href="${esc(ACTORS_HUB)}">Threat actor profiles</a></li></ul>`;

  return shell(id, inner);
}

// ---------------------------------------------------------------------------------------------
// Threat actor detail

export interface ActorBodyData {
  id: string;
  slug: string | null;
  name: string;
  aliases: string[] | null;
  description: string | null;
}

export function renderActorBody(data: ActorBodyData): string {
  const aliases = (data.aliases ?? []).filter(Boolean);
  const description = plain(data.description ?? '');

  const inner = `
<p class="crumbs"><a href="/">WhatCyber</a> / <a href="${esc(ACTORS_HUB)}">Threat actors</a> / ${esc(data.name)}</p>
<h1>${esc(data.name)}</h1>
${aliases.length ? `<p>Also known as: ${esc(aliases.join(', '))}</p>` : ''}
${description ? `<h2>Overview</h2><p>${esc(description)}</p>` : ''}
<h2>More on WhatCyber</h2>
<ul><li><a href="${esc(ACTORS_HUB)}">All threat actor profiles</a></li><li><a href="${esc(KEV_HUB)}">CISA Known Exploited Vulnerabilities catalog</a></li><li><a href="${esc(CVE_HUB)}">Latest CVEs</a></li></ul>`;

  return shell(data.name, inner);
}

// ---------------------------------------------------------------------------------------------
// CISA KEV hub (WHA-17 hubs)

export interface KevHubData {
  page: number;
  totalPages: number;
  total: number;
  entries: {
    cveId: string;
    vendorProject: string;
    product: string;
    vulnerabilityName: string;
    dateAdded: unknown;
    shortDescription: string;
    knownRansomwareCampaignUse: string | null;
  }[];
}

/** Numbered page links, the same pages the app's pager shows. */
function pager(basePath: string, page: number, totalPages: number, label: string): string {
  if (totalPages <= 1) return '';
  const href = (n: number) => (n > 1 ? `${basePath}?page=${n}` : basePath);
  const items = pageList(page, totalPages)
    .map((entry) =>
      entry === 'gap'
        ? '<span>&hellip;</span>'
        : entry === page
          ? `<strong aria-current="page">${entry}</strong>`
          : `<a href="${esc(href(entry))}">${entry}</a>`
    )
    .join(' ');
  const prev = page > 1 ? `<a href="${esc(href(page - 1))}" rel="prev">Previous</a> ` : '';
  const next = page < totalPages ? ` <a href="${esc(href(page + 1))}" rel="next">Next</a>` : '';
  return `<nav aria-label="${esc(label)}">${prev}${items}${next}</nav>`;
}

export function renderKevHubBody(data: KevHubData): string {
  const { page, totalPages, total, entries } = data;
  const inner = `
<p class="crumbs"><a href="/">WhatCyber</a> / CISA KEV catalog</p>
<h1>CISA Known Exploited Vulnerabilities (KEV) Catalog</h1>
<p>Vulnerabilities that CISA has confirmed are being exploited in the wild${total ? `: ${total} in the catalog` : ''}. Newest additions first${totalPages > 1 ? `, page ${page} of ${totalPages}` : ''}.</p>
<ul>${entries
    .map((e) => {
      const ransomware = e.knownRansomwareCampaignUse === 'Known' ? ' <span class="tag warn">Ransomware linked</span>' : '';
      const description = plain(e.shortDescription);
      return `<li><a href="${esc(cveUrl(e.cveId))}">${esc(e.cveId)}</a>: ${esc([e.vendorProject, e.product].filter(Boolean).join(' '))}${e.vulnerabilityName ? ` &ndash; ${esc(e.vulnerabilityName)}` : ''} (added ${esc(formatDate(e.dateAdded))})${ransomware}${description ? `<br>${esc(description.length > 220 ? description.slice(0, 217) + '...' : description)}` : ''}</li>`;
    })
    .join('')}</ul>
${pager(KEV_HUB, page, totalPages, 'KEV catalog pages')}
<h2>More on WhatCyber</h2>
<ul><li><a href="${esc(CVE_HUB)}">Latest CVEs</a></li><li><a href="${esc(ACTORS_HUB)}">Threat actor profiles</a></li><li><a href="/threatfeed">Threat feed</a></li></ul>`;

  return shell('CISA KEV catalog', inner);
}

// ---------------------------------------------------------------------------------------------
// Landing page (WHA-96)

const LANDING_SECTIONS = [
  {
    href: KEV_HUB,
    title: 'CISA Known Exploited Vulnerabilities',
    text: 'Every vulnerability in the CISA KEV catalog, with vendor, product, due date and ransomware use, so you can patch what attackers are already exploiting.',
  },
  {
    href: CVE_HUB,
    title: 'Latest CVEs',
    text: 'Search 215,000+ CVEs from the National Vulnerability Database with CVSS scores, affected products, weaknesses and references.',
  },
  {
    href: ACTORS_HUB,
    title: 'Threat actor profiles',
    text: 'Profiles of 175+ threat groups built on MITRE ATT&CK, with aliases, targeted sectors, techniques and related news.',
  },
  {
    href: '/threatfeed',
    title: 'Threat feed',
    text: 'Cybersecurity news from trusted sources such as Bleeping Computer, Unit 42 and Dark Reading, aggregated in real time.',
  },
  {
    href: '/blog',
    title: 'Blog',
    text: 'Analysis and guides on vulnerabilities, threat intelligence and security operations.',
  },
];

/**
 * The landing page as plain HTML. It needs no data, so the build writes it into index.html, the
 * file Vercel serves for "/" (vite.config.ts). Same headline, sections and FAQ as the React page.
 */
export function renderLandingBody(): string {
  const inner = `
<h1>Threat intelligence for security teams</h1>
<p>Track exploited vulnerabilities from the CISA KEV catalog, 215,000+ CVEs and threat actor profiles, with cybersecurity news from trusted sources, in one dashboard.</p>
<p><a href="/threatfeed">Open the threat feed</a> &middot; <a href="/register">Create a free account</a></p>
<h2>What you can track</h2>
<ul>${LANDING_SECTIONS.map((section) => `<li><a href="${esc(section.href)}">${esc(section.title)}</a>: ${esc(section.text)}</li>`).join('')}</ul>
<h2>Frequently asked questions</h2>
${LANDING_FAQ.map(({ question, answer }) => `<h3>${esc(question)}</h3><p>${esc(answer)}</p>`).join('\n')}`;

  return shell('WhatCyber', inner);
}

// The body block is wrapped in these markers so a shell that already carries one (index.html holds
// the landing copy) can be cleaned before it is reused for another page.
const BODY_START = '<!--ssr-body-->';
const BODY_END = '<!--/ssr-body-->';

/** Places the body block in front of the app's empty container. */
export function injectBody(html: string, body: string): string {
  return stripBody(html).replace(/<div id="root"><\/div>/, `${BODY_START}${body}${BODY_END}\n    <div id="root"></div>`);
}

/** Removes a body block written by injectBody, leaving the bare app shell. */
export function stripBody(html: string): string {
  const start = html.indexOf(BODY_START);
  const end = html.indexOf(BODY_END);
  if (start === -1 || end === -1 || end < start) return html;
  return html.slice(0, start) + html.slice(end + BODY_END.length).replace(/^\n\s*/, '');
}

