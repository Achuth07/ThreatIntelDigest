/**
 * Helpers for building page titles and meta descriptions from data.
 * Search results show roughly 60 characters of title and 155 of description.
 */

const BRAND_SUFFIX = ' | WhatCyber';

/**
 * Turns source text (e.g. a MITRE ATT&CK description with markdown links and
 * "(Citation: ...)" markers) into one plain-text snippet of at most `max`
 * characters, cut at a sentence or word boundary.
 */
export function plainSummary(text: string | null | undefined, max = 155): string {
  if (!text) return '';

  const clean = text
    .replace(/\(Citation:[^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    // some NVD descriptions arrive HTML-escaped; Helmet escapes again on output
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .trim();

  if (clean.length <= max) return clean;

  const window = clean.slice(0, max - 1);
  const sentenceEnd = window.lastIndexOf('. ');
  if (sentenceEnd >= max * 0.6) return window.slice(0, sentenceEnd + 1);

  const wordEnd = window.lastIndexOf(' ');
  return `${window.slice(0, wordEnd > 0 ? wordEnd : window.length).replace(/[.,;:\s]+$/, '')}…`;
}

/** Returns the first candidate (without brand suffix) that fits, with the brand suffix added. */
export function fitTitle(candidates: string[], max = 70): string {
  for (const candidate of candidates) {
    const title = `${candidate}${BRAND_SUFFIX}`;
    if (title.length <= max) return title;
  }
  const last = candidates[candidates.length - 1];
  return `${last.slice(0, max - BRAND_SUFFIX.length - 1).trimEnd()}…${BRAND_SUFFIX}`;
}

/** Title and meta description for a threat actor profile page. */
export function actorSeo(group: { name: string; aliases?: string[] | null; description?: string | null }) {
  const aliases = (group.aliases ?? []).filter((alias) => alias && alias !== group.name);
  const knownAs = aliases.length ? ` (also known as ${aliases.slice(0, 3).join(', ')})` : '';

  return {
    title: fitTitle(
      aliases.length
        ? [
            `${group.name}: Threat Actor Profile, Aliases and Recent News`,
            `${group.name}: Threat Actor Profile and Aliases`,
            `${group.name}: Threat Actor Profile`,
          ]
        : [`${group.name}: Threat Actor Profile and Recent News`, `${group.name}: Threat Actor Profile`]
    ),
    description:
      plainSummary(`${group.name}${knownAs}: ${group.description ?? ''}`) ||
      `Threat actor profile for ${group.name}, with related news.`,
  };
}

/** Title and meta description for a CVE detail page. */
export function cveSeo(cve: {
  cveID: string;
  vendor?: string | null;
  product?: string | null;
  isKev: boolean;
  description?: string | null;
}) {
  const vendor = cve.vendor && cve.vendor !== 'Unknown Vendor' ? cve.vendor : '';
  const product = cve.product ?? '';
  const subject = [vendor, product].filter(Boolean).join(' ');

  const candidates = subject
    ? [
        `${cve.cveID}: ${subject} Vulnerability`,
        ...(vendor && product ? [`${cve.cveID}: ${vendor} Vulnerability`] : []),
        `${cve.cveID} Vulnerability`,
      ]
    : [`${cve.cveID} Vulnerability Details`];

  const detail = isPlaceholderDescription(cve.description) ? '' : cve.description!;
  const lead = cve.isKev ? `${cve.cveID} is in CISA's Known Exploited Vulnerabilities catalog.` : `${cve.cveID}:`;

  return {
    title: fitTitle(candidates),
    description:
      plainSummary(`${lead} ${detail}`) ||
      `${cve.cveID}: severity, CVSS score, affected products and references.`,
  };
}

/** NVD placeholder text that the list API returns when the real description is stored elsewhere. */
export function isPlaceholderDescription(text: string | null | undefined): boolean {
  return !text || /^click to view full details/i.test(text.trim());
}
