// Guards the "real 404" setup in vercel.json.
//
// vercel.json lists the app's page routes explicitly and sends them to the page function
// (api/page.ts), which serves index.html with the right head tags; any other URL falls through to
// dist/public/404.html and a 404 status. That list has to match the routes in
// client/src/App.tsx, or a real page would start returning 404 in production.
//
// This script fails (exit 1) when a route in App.tsx has no matching rewrite, or when a made-up
// URL would be served as a page. It runs before every build (`npm run build`).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appSource = readFileSync(path.join(root, 'client/src/App.tsx'), 'utf8');
const config = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8'));

const routes = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1]);

// Only supports the two path forms used in vercel.json: ":name(a|b|c)" and ":name".
const toRegExp = (source) =>
  new RegExp(
    `^${source
      .replace(/:[A-Za-z]+\(([^)]*)\)/g, '($1)')
      .replace(/:[A-Za-z]+/g, '[^/]+')}$`
  );

const pageRewrites = (config.rewrites ?? [])
  .filter((rewrite) => rewrite.destination === '/api/page' || rewrite.destination === '/index.html')
  .map((rewrite) => ({ source: rewrite.source, pattern: toRegExp(rewrite.source) }));

// Old addresses that now permanently redirect to a new page (WHA-18) also count as handled.
const redirectPatterns = (config.redirects ?? [])
  .filter((redirect) => redirect.permanent && !redirect.source.includes('('))
  .map((redirect) => toRegExp(redirect.source));

const servedAsPage = (urlPath) => urlPath === '/' || pageRewrites.some(({ pattern }) => pattern.test(urlPath));
const redirected = (urlPath) => redirectPatterns.some((pattern) => pattern.test(urlPath));

const failures = [];

for (const route of routes) {
  const sample = route.replace(/:[A-Za-z]+/g, 'sample-1');
  if (!servedAsPage(sample) && !redirected(sample)) failures.push(`App.tsx route ${route} (tested as ${sample}) is not in vercel.json rewrites`);
}

for (const bogus of ['/definitely-not-a-page', '/threatfeed/login', '/blog/a/b', '/admin/users', '/og-image.png']) {
  if (servedAsPage(bogus)) failures.push(`${bogus} would be served as a page, but it should return 404`);
}

if (routes.length === 0) failures.push('No <Route path="..."> found in client/src/App.tsx; update this script');

if (failures.length > 0) {
  console.error('SPA route check failed:\n - ' + failures.join('\n - '));
  process.exit(1);
}

console.log(`SPA route check passed: ${routes.length} routes in App.tsx are covered; unknown URLs fall through to 404.`);
