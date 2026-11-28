import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { z } from '@hono/zod-openapi';
import { listEnvelope, pageTooDeep, MAX_OFFSET } from '../../server/api-v1/lib/responses.js';
import { buildPrefixTsQuery, descriptionFromSearchVector } from '../../server/services/cve-text.js';
import { generateKey, hashSecret, parseKey, KEY_PREFIX } from '../../server/api-v1/api-keys.js';
import { verifySessionToken } from '../../server/api-v1/auth.js';
import { rateLimitHeaders, IP_LIMITS } from '../../server/api-v1/rate-limit.js';
import { CveListItemSchema } from '../../server/api-v1/serializers/cve.js';
import { strict } from '../helpers/contract.js';
import { sessionToken } from '../helpers/request.js';

describe('list envelope links', () => {
  async function envelope(url: string, page: number, count: number, results: number) {
    const app = new Hono();
    app.get('*', c => c.json(listEnvelope(c, { page, page_size: 2 }, ['page', 'page_size', 'vendor'], count, Array(results).fill(0))));
    return (await app.request(url, { headers: { 'x-forwarded-host': 'api.whatcyber.com', 'x-forwarded-proto': 'https' } })).json();
  }

  it('keeps the route parameters and drops everything else, including Vercel host=', async () => {
    const body = await envelope('http://internal/v1/cves?vendor=apache&host=api.whatcyber.com&junk=1&page=2&page_size=2', 2, 10, 2);
    expect(body.next).toBe('https://api.whatcyber.com/v1/cves?vendor=apache&page=3&page_size=2');
    expect(body.previous).toBe('https://api.whatcyber.com/v1/cves?vendor=apache&page=1&page_size=2');
  });

  it('has no next link on the last page', async () => {
    const body = await envelope('http://internal/v1/cves?page=5&page_size=2', 5, 10, 2);
    expect(body.next).toBeNull();
  });

  it('refuses pages past the offset cap', () => {
    expect(pageTooDeep({ page: MAX_OFFSET / 100, page_size: 100 })).toBe(false);
    expect(pageTooDeep({ page: MAX_OFFSET / 100 + 1, page_size: 100 })).toBe(true);
  });
});

describe('CVE text', () => {
  it('removes the ID and the vendor/product tail', () => {
    expect(descriptionFromSearchVector('CVE-1', 'CVE-1 A bug in Apache. apache http_server', ['apache'])).toBe('A bug in Apache.');
  });

  it('keeps description words that look like a vendor ("the nagios user.")', () => {
    expect(descriptionFromSearchVector('CVE-1', 'CVE-1 Runs as the nagios user. nagios nagios_xi', ['nagios'])).toBe('Runs as the nagios user.');
  });

  it('handles text cut mid-way through the products list', () => {
    expect(descriptionFromSearchVector('CVE-1', 'CVE-1 A bug. apache http_server apache tom', ['apache'], true)).toBe('A bug.');
  });

  it('builds a prefix query from the last word', () => {
    expect(buildPrefixTsQuery('Apache log4')).toBe('apache & log4:*');
    expect(buildPrefixTsQuery('!!!')).toBeNull();
  });
});

describe('API keys', () => {
  it('generates keys that parse back and hash to the stored value', () => {
    const { key, keyId, secretHash } = generateKey();
    expect(key.startsWith(KEY_PREFIX)).toBe(true);
    expect(key).toHaveLength(68);
    const parsed = parseKey(key)!;
    expect(parsed.keyId).toBe(keyId);
    expect(hashSecret(parsed.secret)).toBe(secretHash);
  });

  it('rejects malformed keys', () => {
    expect(parseKey('wc_live_short.secret')).toBeNull();
    expect(parseKey('sk_live_abcdefghijklmnop.' + 'a'.repeat(43))).toBeNull();
  });
});

describe('session tokens', () => {
  it('accepts a valid token and rejects expired or tampered ones', () => {
    const secret = process.env.SESSION_SECRET!;
    expect(verifySessionToken(sessionToken(), secret)?.email).toBe('admin@test.local');
    expect(verifySessionToken(sessionToken({ exp: 1 }), secret)).toBeNull();
    const [h, , s] = sessionToken().split('.');
    const forged = Buffer.from(JSON.stringify({ userId: 1, isAdmin: true, exp: 9e9 })).toString('base64').replace(/=/g, '');
    expect(verifySessionToken(`${h}.${forged}.${s}`, secret)).toBeNull();
    expect(verifySessionToken(sessionToken(), 'other-secret')).toBeNull();
  });
});

describe('rate limit headers', () => {
  it('reports Retry-After only when a limit is exceeded', () => {
    const ok = rateLimitHeaders([{ limit: IP_LIMITS[0], hits: 3, remaining: 27, resetSeconds: 40, exceeded: false }]);
    expect(ok['RateLimit-Remaining']).toBe('27');
    expect(ok['Retry-After']).toBeUndefined();
    const blocked = rateLimitHeaders([{ limit: IP_LIMITS[0], hits: 31, remaining: 0, resetSeconds: 12, exceeded: true }]);
    expect(blocked['Retry-After']).toBe('12');
  });
});

describe('strict contract check', () => {
  // The guarantee WHA-40 asks for: a field outside the schema fails.
  const item = {
    cve_id: 'CVE-2024-0001', title: null, description: 'x', published_at: '2024-01-01T00:00:00.000Z',
    modified_at: '2024-01-01T00:00:00.000Z', status: 'Analyzed', severity: null, cvss: null, epss: null,
    is_kev: false, weaknesses: [], vendors: [],
  };

  it('passes a response that matches exactly', () => {
    expect(strict(CveListItemSchema).safeParse(item).success).toBe(true);
  });

  it('fails on an extra top-level field', () => {
    expect(strict(CveListItemSchema).safeParse({ ...item, internal_id: 7 }).success).toBe(false);
  });

  it('fails on an extra nested field', () => {
    const cvss = { score: 9, version: '3.1', severity: 'critical', vector: null, source: 'nvd', raw: 'x' };
    expect(strict(CveListItemSchema).safeParse({ ...item, cvss }).success).toBe(false);
    expect(strict(z.object({ a: z.array(z.object({ b: z.number() })) })).safeParse({ a: [{ b: 1, c: 2 }] }).success).toBe(false);
  });
});

describe('feed text', () => {
  it('strips tags, including encoded ones, and decodes entities', async () => {
    const { plainText, shortSummary } = await import('../../server/api-v1/lib/text.js');
    expect(plainText('<p>Fix &amp; <b>patch</b>.</p><script>alert(1)</script>')).toBe('Fix & patch.');
    expect(plainText('&lt;img src=x onerror=alert(1)&gt;Hello &#8217;s')).toBe('Hello ’s');
    expect(shortSummary('word '.repeat(200), 50)!.length).toBeLessThanOrEqual(50);
    expect(shortSummary('   ')).toBeNull();
    expect(plainText('YARA-X&amp;amp;#39;s release')).toBe("YARA-X's release");
    expect(plainText('I&#xe2;&#x80;&#x99;ve seen an&#xc2;&#xa0;option. Café stays')).toBe('I’ve seen an option. Café stays');
  });
});
