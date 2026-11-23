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

import { ACTORS_HUB, CVE_HUB, CWE_HUB, KEV_HUB, VENDORS_HUB, actorUrl, cveUrl, cweUrl, productUrl, vendorUrl } from '../../client/src/lib/urls.js';
import { LANDING_FAQ } from '../../client/src/lib/jsonld.js';
import type { CweHub, CweIndexRow, HubCve, HubKev, HubNews, ProductHub, SeverityCounts, VendorHub, VendorIndexRow } from './hub-data.js';
import { cveSummary, cveTimeline } from '../../client/src/lib/cve-summary.js';
import { KEV_ANSWER, KEV_FAQ } from '../../client/src/lib/kev-content.js';
import { HUB_ANSWERS, cveSources, isoDay, sourcesFor, type HubKind } from '../../client/src/lib/provenance.js';
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
  { href: VENDORS_HUB, label: 'By vendor' },
  { href: CWE_HUB, label: 'By weakness' },
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

/** When the page's data last changed and where it comes from (WHA-28). Same wording as the app. */
function provenance(kind: HubKind, latest?: unknown, label = 'Latest entry'): string {
  const day = isoDay(latest);
  const links = sourcesFor(kind)
    .map((source) => `<a href="${esc(source.url)}" rel="noopener">${esc(source.name)}</a>`)
    .join(', ');
  return `<p class="crumbs">${day ? `${esc(label)}: ${esc(day)}. ` : ''}Sources: ${links}.</p>`;
}

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
  /** Threat actors named in news about this CVE. */
  actors?: { id: string; slug: string | null; name: string }[];
  /** Vendor hubs that exist for this CVE's vendors, and CWE ids that have a hub (WHA-24). */
  vendorHubs?: { slug: string; name: string }[];
  cweHubIds?: string[];
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
    epssScore: number | null;
    /** False when stored text exists but could not be read, so its absence says nothing. */
    contentKnown?: boolean;
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

  const summaryFacts = {
    id,
    vendor,
    product,
    name: kev?.vulnerabilityName,
    publishedDate: nvd?.publishedDate,
    kev,
    cvssScore: nvd?.cvssV3Score ?? nvd?.cvssV2Score ?? null,
    severity: nvd?.cvssV3Severity ?? nvd?.cvssV2Severity ?? null,
    epssScore: nvd?.epssScore ?? null,
    status: nvd?.status ?? null,
  };
  const summary = cveSummary(summaryFacts);
  const timeline = cveTimeline(summaryFacts);

  const inner = `
<p class="crumbs"><a href="/">WhatCyber</a> / <a href="${esc(kev ? KEV_HUB : CVE_HUB)}">${kev ? 'CISA KEV catalog' : 'Vulnerabilities'}</a> / ${esc(id)}</p>
<h1>${esc(id)}${vendor || product ? `: ${esc([vendor, product].filter(Boolean).join(' '))}` : ''}</h1>
${kev?.vulnerabilityName ? `<p>${esc(kev.vulnerabilityName)}</p>` : ''}
<p>${tags.join(' ')}</p>
<p>${esc(summary)}</p>
${description ? `<h2>Description</h2><p>${esc(description)}</p>` : ''}
${facts.length ? `<h2>Key facts</h2><dl>${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
${kev?.requiredAction ? `<h2>Required action</h2><p>${esc(plain(kev.requiredAction))}</p>` : ''}
${kev?.notes ? `<p>${esc(plain(kev.notes))}</p>` : ''}
${timeline.length ? `<h2>Timeline</h2><ul>${timeline.map((e) => `<li>${esc(e.date)}: ${esc(e.label)}${e.note ? ` (${esc(e.note)})` : ''}</li>`).join('')}</ul>` : ''}
${nvd?.weaknesses?.length ? `<h2>Weaknesses (CWE)</h2><ul>${nvd.weaknesses.map((w) => `<li>${data.cweHubIds?.includes(String(w).toUpperCase()) ? `<a href="${esc(cweUrl(String(w)))}">${esc(w)}</a>` : esc(w)}</li>`).join('')}</ul>` : ''}
${products.length ? `<h2>Affected products</h2><ul>${products.map((p) => { const versions = (p.versions ?? []).filter((v) => v && v !== '-' && v !== '*').slice(0, 12); return `<li>${esc([p.vendor, p.product].filter(Boolean).join(' '))}${versions.length ? ` (versions: ${esc(versions.join(', '))})` : ''}</li>`; }).join('')}${moreProducts > 0 ? `<li>and ${moreProducts} more</li>` : ''}</ul>` : nvd?.vendors?.length ? `<h2>Affected vendors</h2><p>${esc(nvd.vendors.join(', '))}</p>` : ''}
${data.actors?.length ? `<h2>Threat actors named in news about this CVE</h2><p>Groups mentioned in news articles that also name ${esc(id)}. This is not a confirmed attribution.</p><ul>${data.actors.map((a) => `<li><a href="${esc(actorUrl(a))}">${esc(a.name)}</a></li>`).join('')}</ul>` : ''}
${references.length ? `<h2>References</h2><ul>${references.map((r) => `<li><a href="${esc(safeUrl(r.url))}" rel="nofollow noopener">${esc(r.url)}</a></li>`).join('')}</ul>` : ''}
<h2>Primary sources</h2>
<ul>${cveSources(id, Boolean(kev)).map((src) => `<li><a href="${esc(src.url)}" rel="noopener">${esc(src.name)}</a></li>`).join('')}</ul>
<h2>More on WhatCyber</h2>
<ul>${(data.vendorHubs ?? []).map((v) => `<li><a href="${esc(vendorUrl(v.slug))}">${esc(v.name)} vulnerabilities</a></li>`).join('')}<li><a href="${esc(CVE_HUB)}">Latest CVEs</a></li><li><a href="${esc(KEV_HUB)}">CISA Known Exploited Vulnerabilities catalog</a></li><li><a href="${esc(ACTORS_HUB)}">Threat actor profiles</a></li></ul>`;

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
  /** The vendors with the most KEV entries. */
  topVendors?: { vendor: string; count: number }[];
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
${page === 1 ? `<p>${esc(KEV_ANSWER)}</p>` : ''}
<p>${total ? `${total.toLocaleString('en-US')} vulnerabilities in the catalog. ` : ''}Newest additions first${totalPages > 1 ? `, page ${page} of ${totalPages}` : ''}.</p>
<ul>${entries
    .map((e) => {
      const ransomware = e.knownRansomwareCampaignUse === 'Known' ? ' <span class="tag warn">Ransomware linked</span>' : '';
      const description = plain(e.shortDescription);
      return `<li><a href="${esc(cveUrl(e.cveId))}">${esc(e.cveId)}</a>: ${esc([e.vendorProject, e.product].filter(Boolean).join(' '))}${e.vulnerabilityName ? ` &ndash; ${esc(e.vulnerabilityName)}` : ''} (added ${esc(formatDate(e.dateAdded))})${ransomware}${description ? `<br>${esc(description.length > 220 ? description.slice(0, 217) + '...' : description)}` : ''}</li>`;
    })
    .join('')}</ul>
${pager(KEV_HUB, page, totalPages, 'KEV catalog pages')}
${page === 1 && data.topVendors?.length ? `<h2>Most affected vendors</h2><ul>${data.topVendors.map((v) => `<li>${esc(v.vendor)}: ${v.count} ${v.count === 1 ? 'entry' : 'entries'}</li>`).join('')}</ul>` : ''}
${page === 1 ? `<h2>Frequently asked questions</h2>\n${KEV_FAQ.map(({ question, answer }) => `<h3>${esc(question)}</h3><p>${esc(answer)}</p>`).join('\n')}` : ''}
${provenance('kev', page === 1 ? entries[0]?.dateAdded : undefined, 'Newest entry added')}
<h2>More on WhatCyber</h2>
<ul><li><a href="${esc(CVE_HUB)}">Latest CVEs</a></li><li><a href="${esc(ACTORS_HUB)}">Threat actor profiles</a></li><li><a href="/threatfeed">Threat feed</a></li></ul>`;

  return shell('CISA KEV catalog', inner);
}

// ---------------------------------------------------------------------------------------------
// Threat actor directory (WHA-17 hubs)

export interface ActorsHubData {
  page: number;
  totalPages: number;
  total: number;
  /** The most recent update of any profile. */
  latest?: unknown;
  entries: { id: string; slug: string | null; name: string; aliases: string[] | null; description: string | null }[];
}

export function renderActorsHubBody(data: ActorsHubData): string {
  const { page, totalPages, total, entries } = data;
  const inner = `
<p class="crumbs"><a href="/">WhatCyber</a> / Threat actors</p>
<h1>Threat Actor Directory</h1>
<p>${esc(HUB_ANSWERS.actors)}</p>
<p>${total ? `${total} profiles` : 'Profiles'}${totalPages > 1 ? `, page ${page} of ${totalPages}` : ''}, most recently updated first.</p>
<ul>${entries
    .map((a) => {
      const aliases = (a.aliases ?? []).filter(Boolean).slice(0, 4);
      const description = plain(a.description ?? '');
      return `<li><a href="${esc(actorUrl(a))}">${esc(a.name)}</a>${aliases.length ? ` (also known as ${esc(aliases.join(', '))})` : ''}${description ? `<br>${esc(description.length > 220 ? description.slice(0, 217) + '...' : description)}` : ''}</li>`;
    })
    .join('')}</ul>
${pager(ACTORS_HUB, page, totalPages, 'Threat actor pages')}
${provenance('actors', data.latest, 'Most recent update')}
<h2>More on WhatCyber</h2>
<ul><li><a href="${esc(KEV_HUB)}">CISA Known Exploited Vulnerabilities catalog</a></li><li><a href="${esc(CVE_HUB)}">Latest CVEs</a></li><li><a href="/threatfeed">Threat feed</a></li></ul>`;

  return shell('Threat actors', inner);
}

// ---------------------------------------------------------------------------------------------
// Latest CVEs hub (WHA-17 hubs)

export interface CveHubData {
  total: number;
  entries: {
    id: string;
    publishedDate: unknown;
    severity: string | null;
    score: number | null;
    vendors: string[] | null;
  }[];
}

export function renderCveHubBody(data: CveHubData): string {
  const { total, entries } = data;
  const inner = `
<p class="crumbs"><a href="/">WhatCyber</a> / Vulnerabilities</p>
<h1>Latest CVEs</h1>
<p>${esc(HUB_ANSWERS.cve)}</p>
<p>${total ? `${total.toLocaleString('en-US')} CVEs tracked. ` : ''}Newest first.</p>
<ul>${entries
    .map((c) => {
      const vendors = (c.vendors ?? []).filter(Boolean).slice(0, 3);
      const bits = [
        c.severity ? `${c.severity}${c.score != null ? ` ${c.score}` : ''}` : '',
        vendors.join(', '),
        c.publishedDate ? `published ${formatDate(c.publishedDate)}` : '',
      ].filter(Boolean);
      return `<li><a href="${esc(cveUrl(c.id))}">${esc(c.id)}</a>${bits.length ? ` &ndash; ${esc(bits.join(' · '))}` : ''}</li>`;
    })
    .join('')}</ul>
${provenance('cve', entries[0]?.publishedDate, 'Newest CVE published')}
<h2>More on WhatCyber</h2>
<ul><li><a href="${esc(KEV_HUB)}">CISA Known Exploited Vulnerabilities catalog</a></li><li><a href="${esc(ACTORS_HUB)}">Threat actor profiles</a></li><li><a href="/threatfeed">Threat feed</a></li></ul>`;

  return shell('Latest CVEs', inner);
}

// ---------------------------------------------------------------------------------------------
// Vendor and CWE hubs (WHA-24)

const fmt = (n: number) => n.toLocaleString('en-US');

function severityLine(sev: SeverityCounts): string {
  const total = sev.CRITICAL + sev.HIGH + sev.MEDIUM + sev.LOW;
  if (!total) return '';
  return `Of the ${fmt(total)} with a CVSS v3 score, ${fmt(sev.CRITICAL)} are critical, ${fmt(sev.HIGH)} high, ${fmt(sev.MEDIUM)} medium and ${fmt(sev.LOW)} low.`;
}

function cveList(rows: HubCve[]): string {
  return `<ul>${rows
    .map((c) => {
      const bits = [c.severity ? `${c.severity}${c.score != null ? ` ${c.score}` : ''}` : '', c.publishedDate ? `published ${formatDate(c.publishedDate)}` : ''].filter(Boolean);
      return `<li><a href="${esc(cveUrl(c.id))}">${esc(c.id)}</a>${bits.length ? ` &ndash; ${esc(bits.join(' · '))}` : ''}</li>`;
    })
    .join('')}</ul>`;
}

function kevList(rows: HubKev[]): string {
  return `<ul>${rows
    .map((e) => {
      const ransomware = e.knownRansomwareCampaignUse === 'Known' ? ' <span class="tag warn">Ransomware linked</span>' : '';
      return `<li><a href="${esc(cveUrl(e.cveId))}">${esc(e.cveId)}</a>: ${esc([e.vendorProject, e.product].filter(Boolean).join(' '))} &ndash; ${esc(e.vulnerabilityName)} (added ${esc(formatDate(e.dateAdded))})${ransomware}</li>`;
    })
    .join('')}</ul>`;
}

function newsList(rows: HubNews[]): string {
  return `<ul>${rows
    .map((n) => `<li><a href="${esc(safeUrl(n.url) ?? '#')}" rel="nofollow noopener">${esc(n.title)}</a> &ndash; ${esc(n.source)}${n.publishedAt ? `, ${esc(formatDate(n.publishedAt))}` : ''}</li>`)
    .join('')}</ul>`;
}

const hubFooterLinks = `<h2>More on WhatCyber</h2>
<ul><li><a href="${esc(VENDORS_HUB)}">Vulnerabilities by vendor</a></li><li><a href="${esc(CWE_HUB)}">Vulnerabilities by weakness (CWE)</a></li><li><a href="${esc(KEV_HUB)}">CISA Known Exploited Vulnerabilities catalog</a></li><li><a href="${esc(CVE_HUB)}">Latest CVEs</a></li></ul>`;

export function renderVendorsIndexBody(rows: VendorIndexRow[]): string {
  const inner = `
<p class="crumbs"><a href="/">WhatCyber</a> / Vendors</p>
<h1>Vulnerabilities by vendor</h1>
<p>${esc(HUB_ANSWERS.vendors)}</p>
<p>The ${rows.length} vendors with the most CVEs, with how many of their vulnerabilities are in CISA's Known Exploited Vulnerabilities catalog.</p>
<ul>${rows
    .map((v) => `<li><a href="${esc(vendorUrl(v.slug))}">${esc(v.name)}</a>: ${fmt(v.cveCount)} CVEs${v.kevCount ? `, ${fmt(v.kevCount)} known exploited` : ''}</li>`)
    .join('')}</ul>
${provenance('vendors', rows[0]?.updatedAt, 'Rankings updated')}
${hubFooterLinks}`;
  return shell('Vulnerabilities by vendor', inner);
}

export function renderCweIndexBody(rows: CweIndexRow[]): string {
  const inner = `
<p class="crumbs"><a href="/">WhatCyber</a> / Weaknesses</p>
<h1>Common software weaknesses (CWE)</h1>
<p>${esc(HUB_ANSWERS.cwe)}</p>
<p>The ${rows.length} weaknesses behind the most CVEs.</p>
<ul>${rows
    .map((c) => `<li><a href="${esc(cweUrl(c.id))}">${esc(c.id)}${c.name ? `: ${esc(c.name)}` : ''}</a> &ndash; ${fmt(c.cveCount)} CVEs${c.kevCount ? `, ${fmt(c.kevCount)} known exploited` : ''}</li>`)
    .join('')}</ul>
${provenance('cwe', rows[0]?.updatedAt, 'Rankings updated')}
${hubFooterLinks}`;
  return shell('Common software weaknesses', inner);
}

export function renderVendorHubBody(hub: VendorHub): string {
  const sevLine = severityLine(hub.severity);
  const inner = `
<p class="crumbs"><a href="/">WhatCyber</a> / <a href="${esc(VENDORS_HUB)}">Vendors</a> / ${esc(hub.name)}</p>
<h1>${esc(hub.name)} vulnerabilities</h1>
<p>${esc(hub.name)} has ${fmt(hub.cveCount)} CVEs recorded in the National Vulnerability Database${hub.kevCount ? `, ${fmt(hub.kevCount)} of them in CISA's Known Exploited Vulnerabilities (KEV) catalog` : ''}. ${esc(sevLine)}</p>
<h2>Latest ${esc(hub.name)} CVEs</h2>
${cveList(hub.recent)}
${hub.kev.length ? `<h2>Known exploited ${esc(hub.name)} vulnerabilities</h2>\n${kevList(hub.kev)}` : ''}
${hub.products.length ? `<h2>${esc(hub.name)} products with known exploited vulnerabilities</h2><ul>${hub.products.map((pr) => `<li><a href="${esc(productUrl(hub.slug, pr.slug))}">${esc(pr.name)}</a>: ${fmt(pr.kevCount)} ${pr.kevCount === 1 ? 'entry' : 'entries'} in the KEV catalog</li>`).join('')}</ul>` : ''}
${hub.news.length ? `<h2>${esc(hub.name)} in the news</h2>\n${newsList(hub.news)}` : ''}
${hub.topWeaknesses.length ? `<h2>Most common weaknesses</h2><ul>${hub.topWeaknesses.map((w) => `<li><a href="${esc(cweUrl(w.id))}">${esc(w.id)}${w.name ? `: ${esc(w.name)}` : ''}</a> (${fmt(w.count)} CVEs)</li>`).join('')}</ul>` : ''}
${provenance('vendor', hub.recent[0]?.publishedDate, 'Newest CVE published')}
${hubFooterLinks}`;
  return shell(hub.name, inner);
}

export function renderCweHubBody(hub: CweHub): string {
  const sevLine = severityLine(hub.severity);
  const description = plain(hub.description ?? '');
  const inner = `
<p class="crumbs"><a href="/">WhatCyber</a> / <a href="${esc(CWE_HUB)}">Weaknesses</a> / ${esc(hub.id)}</p>
<h1>${esc(hub.id)}${hub.name ? `: ${esc(hub.name)}` : ''}</h1>
${hub.category ? `<p>Category: ${esc(hub.category)}</p>` : ''}
${description ? `<p>${esc(description)}</p>` : ''}
<p>${fmt(hub.cveCount)} CVEs have this weakness${hub.kevCount ? `, ${fmt(hub.kevCount)} of them in CISA's Known Exploited Vulnerabilities (KEV) catalog` : ''}. ${esc(sevLine)}</p>
<h2>Latest CVEs with ${esc(hub.id)}</h2>
${cveList(hub.recent)}
${hub.kev.length ? `<h2>Known exploited vulnerabilities with ${esc(hub.id)}</h2>\n${kevList(hub.kev)}` : ''}
${hub.topVendors.length ? `<h2>Most affected vendors</h2><ul>${hub.topVendors.map((v) => `<li>${v.slug ? `<a href="${esc(vendorUrl(v.slug))}">${esc(v.name)}</a>` : esc(v.name)}: ${fmt(v.count)} CVEs</li>`).join('')}</ul>` : ''}
${provenance('weakness', hub.recent[0]?.publishedDate, 'Newest CVE published')}
${hubFooterLinks}`;
  return shell(hub.id, inner);
}

export function renderProductHubBody(hub: ProductHub): string {
  const name = `${hub.vendorName} ${hub.productName}`;
  const inner = `
<p class="crumbs"><a href="/">WhatCyber</a> / <a href="${esc(VENDORS_HUB)}">Vendors</a> / ${hub.vendorHub ? `<a href="${esc(vendorUrl(hub.vendorHub.slug))}">${esc(hub.vendorHub.name)}</a>` : esc(hub.vendorName)} / ${esc(hub.productName)}</p>
<h1>${esc(name)} vulnerabilities</h1>
<p>CISA lists ${fmt(hub.kevCount)} ${esc(name)} ${hub.kevCount === 1 ? 'vulnerability' : 'vulnerabilities'} in its Known Exploited Vulnerabilities (KEV) catalog, which means attackers are exploiting ${hub.kevCount === 1 ? 'it' : 'them'} in the wild. The newest are listed first.</p>
<h2>Known exploited ${esc(name)} vulnerabilities</h2>
${kevList(hub.kev)}
<h2>Latest CVEs mentioning ${esc(name)}</h2>
${cveList(hub.recent)}
${hub.vendorHub ? `<p><a href="${esc(vendorUrl(hub.vendorHub.slug))}">All ${esc(hub.vendorHub.name)} vulnerabilities</a></p>` : ''}
${provenance('product', hub.kev[0]?.dateAdded, 'Newest KEV entry added')}
${hubFooterLinks}`;
  return shell(name, inner);
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

