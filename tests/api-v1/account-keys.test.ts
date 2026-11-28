import { describe, expect, it } from 'vitest';
import { useTestDb } from '../helpers/db.js';
import { apiKey, call, sessionToken } from '../helpers/request.js';
import { expectContract } from '../helpers/contract.js';

const testDb = useTestDb();
const token = () => sessionToken();

describe('/v1/account/keys', () => {
  it('creates, lists, uses and revokes a key', async () => {
    const created = await call('/v1/account/keys', { method: 'POST', token: token(), body: { name: 'SIEM', scopes: ['catalog:read'], expires_in_days: 30 } });
    expect(created.status).toBe(201);
    const { key, api_key } = await expectContract(created, 'POST', '/account/keys');
    expect(key).toMatch(/^wc_live_[A-Za-z0-9]{16}\.[A-Za-z0-9_-]{43}$/);
    expect(api_key).toMatchObject({ name: 'SIEM', scopes: ['catalog:read'] });
    expect(api_key.expires_at).not.toBeNull();

    const listed = await call('/v1/account/keys', { token: token() });
    const body = await expectContract(listed, 'GET', '/account/keys');
    expect(body.keys.map((k: any) => k.id)).toContain(api_key.id);
    expect(JSON.stringify(body)).not.toContain(key.split('.')[1]);

    expect((await call('/v1/cves', { key })).status).toBe(200);

    const revoked = await call(`/v1/account/keys/${api_key.id}`, { method: 'DELETE', token: token() });
    expect(revoked.status).toBe(204);
    await expectContract(revoked, 'DELETE', '/account/keys/{id}');
    expect((await call('/v1/cves', { key })).status).toBe(401);
    expect((await call(`/v1/account/keys/${api_key.id}`, { method: 'DELETE', token: token() })).status).toBe(404);
  });

  it('gives a new key every read scope by default', async () => {
    const res = await call('/v1/account/keys', { method: 'POST', token: token(), body: { name: 'Default scopes' } });
    const { api_key } = await expectContract(res, 'POST', '/account/keys');
    expect(api_key.scopes).toEqual(['catalog:read', 'kev:read', 'actors:read', 'news:read', 'stats:read']);
  });

  it('refuses an API key: keys cannot manage keys', async () => {
    const res = await call('/v1/account/keys', { key: await apiKey() });
    expect(res.status).toBe(403);
    expect((await expectContract(res, 'GET', '/account/keys')).error.code).toBe('session_required');
  });

  it.each([
    [{ name: '' }, 'name'],
    [{ name: 'x', scopes: ['admin:write'] }, 'scopes.0'],
    [{ name: 'x', expires_in_days: 0 }, 'expires_in_days'],
  ])('rejects the body %j', async (body, field) => {
    const res = await call('/v1/account/keys', { method: 'POST', token: token(), body });
    expect(res.status).toBe(400);
    const parsed = await expectContract(res, 'POST', '/account/keys');
    expect(parsed.error.details.fields.map((f: any) => f.field)).toContain(field);
  });

  it('returns validation_error for malformed JSON', async () => {
    const res = await call('/v1/account/keys', { method: 'POST', token: token(), body: '{"name":' });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('validation_error');
  });

  it('stops at five active keys', async () => {
    await testDb.pg.exec('DELETE FROM api_keys');
    for (let i = 0; i < 5; i++) {
      expect((await call('/v1/account/keys', { method: 'POST', token: token(), body: { name: `k${i}` } })).status).toBe(201);
    }
    const res = await call('/v1/account/keys', { method: 'POST', token: token(), body: { name: 'one too many' } });
    expect(res.status).toBe(409);
    expect((await expectContract(res, 'POST', '/account/keys')).error.code).toBe('key_limit');
  });

  it('returns 404 for a key id that is not a uuid', async () => {
    const res = await call('/v1/account/keys/123', { method: 'DELETE', token: token() });
    expect(res.status).toBe(404);
  });
});
