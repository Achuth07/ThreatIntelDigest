/**
 * Writes page-specific <head> tags into the app's HTML shell.
 *
 * The shell (index.html) is one file served for every page, and link-preview and other crawlers
 * that do not run JavaScript read only that raw HTML. This replaces the generic title,
 * description, robots, canonical, Open Graph and Twitter tags with the values for the page being
 * requested. Pure string work, so the build (vite.config.ts) and the server (api/page.ts) share it.
 *
 * The browser later removes these tags and lets the SEO component (react-helmet) set the same
 * values, see removeStaticHeadTags in client/src/components/seo.tsx.
 */

import { DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_ALT } from '../../client/src/lib/seo-core.js';

export interface HeadTags {
  title: string;
  description: string;
  /** Omit for pages that must not claim a canonical address (e.g. a 404 page). */
  canonical?: string;
  noindex?: boolean;
  /** Open Graph type, e.g. "article" for blog posts. Defaults to "website". */
  type?: string;
  /** Absolute image URL. Defaults to the shared social image (with its size and alt text). */
  image?: string;
  /** Structured data (schema.org JSON-LD) for the page. Replaces the generic block in the shell. */
  jsonLd?: Record<string, any> | Record<string, any>[];
}

const escapeAttribute = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// JSON inside a <script> must not be able to close it: escape "<" (valid JSON, same value).
const jsonForScript = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function injectHead(shell: string, tags: HeadTags): string {
  if (!/<\/head>/i.test(shell)) return shell;

  const image = tags.image ?? DEFAULT_OG_IMAGE;
  const isDefaultImage = image === DEFAULT_OG_IMAGE;
  const title = escapeAttribute(tags.title);
  const description = escapeAttribute(tags.description);

  const lines: string[] = [
    `<title>${escapeText(tags.title)}</title>`,
    `<meta name="description" content="${description}">`,
    `<meta name="robots" content="${tags.noindex ? 'noindex, follow' : 'index, follow'}">`,
  ];

  if (tags.canonical) lines.push(`<link rel="canonical" href="${escapeAttribute(tags.canonical)}">`);

  lines.push(`<meta property="og:type" content="${escapeAttribute(tags.type ?? 'website')}">`);
  if (tags.canonical) lines.push(`<meta property="og:url" content="${escapeAttribute(tags.canonical)}">`);
  lines.push(
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:image" content="${escapeAttribute(image)}">`
  );
  if (isDefaultImage) {
    lines.push(
      '<meta property="og:image:width" content="1200">',
      '<meta property="og:image:height" content="630">',
      `<meta property="og:image:alt" content="${escapeAttribute(DEFAULT_OG_IMAGE_ALT)}">`
    );
  }

  lines.push(
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta name="twitter:image" content="${escapeAttribute(image)}">`
  );
  if (isDefaultImage) {
    lines.push(`<meta name="twitter:image:alt" content="${escapeAttribute(DEFAULT_OG_IMAGE_ALT)}">`);
  }

  // Marked so the app can swap them for its own when a page supplies structured data (SEO component).
  for (const block of tags.jsonLd ? ([] as Record<string, any>[]).concat(tags.jsonLd) : []) {
    lines.push(`<script type="application/ld+json" data-ssr-jsonld>${jsonForScript(block)}</script>`);
  }

  const withoutOldTags = shell
    .replace(/<title>[\s\S]*?<\/title>[ \t]*\r?\n?/gi, '')
    .replace(
      /[ \t]*<meta\s+(?:name|property)="(?:description|keywords|robots|og:[^"]*|twitter:[^"]*)"[^>]*>[ \t]*\r?\n?/gi,
      ''
    )
    .replace(/[ \t]*<link\s+rel="canonical"[^>]*>[ \t]*\r?\n?/gi, '')
    .replace(/[ \t]*<!--\s*(?:Open Graph|Twitter)[\s\S]*?-->[ \t]*\r?\n?/gi, '')
    // The shell's generic WebSite block described the feed page on every URL; pages now bring their own.
    .replace(/[ \t]*<!--\s*Structured Data\s*-->[ \t]*\r?\n?/gi, '')
    .replace(/[ \t]*<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>[ \t]*\r?\n?/gi, '');

  return withoutOldTags.replace(/<\/head>/i, `    ${lines.join('\n    ')}\n  </head>`);
}
