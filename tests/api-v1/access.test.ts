import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTestDb } from '../helpers/db.js';
import { apiKey, call, sessionToken } from '../helpers/request.js';
import { expectContract } from '../helpers/contract.js';
import { OTHER_USER } from '../helpers/seed.js';

const testDb = useTestDb();

// These tests make many keys; start each one under the five-key limit.
beforeEach(async () => { await testDb.pg.exec('DELETE FROM api_keys'); });

describe('ping and common headers', () => {
  it('answers /v1/ping and /api/v1/ping with the shared headers', async () => {
    for (const path of ['/v1/ping', '/api/v1/ping']) {
      const res = await call(path, { token: sessionToken() });
      expect(res.status).toBe(200);
      const body = await expectContract(res, 'GET', '/ping');
      expect(body.status).toBe('ok');
      expect(res.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
      expect(res.headers.get('x-robots-tag')).toBe('noindex');
      expect(res.headers.get('server-timing')).toMatch(/^app;dur=\d+(\.\d)?$/);
      expect(res.headers.get('ratelimit-limit')).toBeTruthy();
    }
  });

  it('returns not_found for unknown routes', async () => {
    const res = await call('/v1/nope', { key: await apiKey() });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('not_found');
  });

  it('serves the OpenAPI document', async () => {
    const res = await call('/v1/openapi.json', { key: await apiKey() });
    expect(res.status).toBe(200);
    const doc = await res.json();
    expect(Object.keys(doc.paths)).toEqual(expect.arrayContaining(['/ping', '/cves', '/cves/{id}', '/account/keys', '/account/keys/{id}']));
  });

  it('answers CORS preflights without credentials', async () => {
    const res = await call('/v1/cves', { method: 'OPTIONS', headers: { origin: 'https://example.com', 'access-control-request-method': 'GET' } });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});

describe('authentication', () => {
  it('refuses a request with no credentials', async () => {
    const res = await call('/v1/cves');
    expect(res.status).toBe(401);
    expect((await expectContract(res, 'GET', '/cves')).error.code).toBe('invalid_token');
  });

  it('refuses unknown, malformed and revoked keys with one message', async () => {
    const key = await apiKey();
    await testDb.pg.query(`UPDATE api_keys SET revoked_at = now() WHERE key_id = $1`, [key.slice(8, 24)]);
    const messages = new Set<string>();
    for (const bad of [key, 'wc_live_AAAAAAAAAAAAAAAA.' + 'a'.repeat(43), 'wc_live_nope']) {
      const res = await call('/v1/cves', { key: bad });
      expect(res.status).toBe(401);
      messages.add((await res.json()).error.message);
    }
    expect(messages.size).toBe(1);
  });

  it('accepts a key as Bearer or X-API-Key', async () => {
    const key = await apiKey();
    expect((await call('/v1/cves', { key })).status).toBe(200);
    expect((await call('/v1/cves', { headers: { authorization: `Bearer ${key}` } })).status).toBe(200);
  });

  it('refuses the session token on data routes', async () => {
    const res = await call('/v1/cves', { token: sessionToken() });
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('invalid_token');
  });

  it('refuses a key without the route scope', async () => {
    const res = await call('/v1/cves', { key: await apiKey(['kev:read']) });
    expect(res.status).toBe(403);
    const body = await expectContract(res, 'GET', '/cves');
    expect(body.error).toMatchObject({ code: 'insufficient_scope', details: { required_scope: 'catalog:read' } });
  });

  it('is admin-only: keys and sessions of other accounts are refused', async () => {
    const key = await apiKey(['catalog:read'], OTHER_USER.id);
    expect((await call('/v1/cves', { key })).status).toBe(403);
    expect((await call('/v1/ping', { token: sessionToken({ userId: OTHER_USER.id, email: OTHER_USER.email }) })).status).toBe(403);
    expect((await call('/v1/ping', { token: sessionToken({ isAdmin: false }) })).status).toBe(403);
  });

  it('refuses every request when SESSION_SECRET is missing', async () => {
    const token = sessionToken();
    const saved = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;
    try {
      const res = await call('/v1/ping', { token });
      expect(res.status).toBe(503);
      expect((await res.json()).error.code).toBe('unavailable');
    } finally {
      process.env.SESSION_SECRET = saved;
    }
  });
});

describe('rate limits', () => {
  it('blocks an IP after 30 requests a minute, before checking credentials', async () => {
    let last: Response | undefined;
    for (let i = 0; i < 31; i++) last = await call('/v1/ping', { ip: '203.0.113.9' });
    expect(last!.status).toBe(429);
    expect(Number(last!.headers.get('retry-after'))).toBeGreaterThan(0);
    expect((await expectContract(last!, 'GET', '/ping')).error.code).toBe('rate_limited');
  });

  it('blocks an account after 60 requests a minute across IPs', async () => {
    const key = await apiKey();
    let status = 0;
    for (let i = 0; i < 61; i++) status = (await call('/v1/ping', { key })).status;
    expect(status).toBe(429);
  });

  it('fails closed when the counters cannot be written', async () => {
    await testDb.pg.exec('ALTER TABLE api_rate_limits RENAME TO api_rate_limits_off');
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = await call('/v1/ping', { token: sessionToken() });
      expect(res.status).toBe(503);
      expect(logged).toHaveBeenCalled();
    } finally {
      logged.mockRestore();
      await testDb.pg.exec('ALTER TABLE api_rate_limits_off RENAME TO api_rate_limits');
    }
  });
});
