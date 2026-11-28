import { beforeAll, describe, expect, it } from 'vitest';
import { useTestDb } from '../helpers/db.js';
import { apiKey, call } from '../helpers/request.js';
import { expectContract } from '../helpers/contract.js';

useTestDb();

let key: string;
beforeAll(async () => { key = await apiKey(['kev:read']); });

async function list(query = '') {
  const res = await call(`/v1/kev${query ? `?${query}` : ''}`, { key });
  const body = await expectContract(res, 'GET', '/kev');
  return { res, body, ids: res.status === 200 ? body.results.map((r: any) => r.cve_id) : [] };
}

async function detail(id: string, query = '') {
  const res = await call(`/v1/kev/${id}${query ? `?${query}` : ''}`, { key });
  return { res, body: await expectContract(res, 'GET', '/kev/{cve_id}') };
}

describe('GET /v1/kev', () => {
  it('lists every entry, newest first, with an exact count', async () => {
    const { res, body, ids } = await list();
    expect(res.status).toBe(200);
    expect(ids).toEqual(['CVE-2025-9999', 'CVE-2024-0001']);
    expect(body.count).toBe(2);
    expect(body.count_estimated).toBeUndefined();
  });

  it('joins scores, normalises ransomware use and works out overdue', async () => {
    const { body } = await list();
    const [missing, fortinet] = body.results;
    expect(fortinet).toMatchObject({
      vendor: 'Fortinet', product: 'FortiOS', date_added: '2024-03-05', due_date: '2024-03-26', overdue: true,
      ransomware_use: 'known', notes: null, severity: 'critical', epss: { score: 0.94, percentile: 0.999 },
    });
    expect(fortinet.cvss).toMatchObject({ score: 10, source: 'nvd' });
    // The CVE is not in the CVE table yet: the entry is still listed, without scores.
    expect(missing).toMatchObject({ overdue: false, ransomware_use: 'unknown', cvss: null, severity: null, epss: null, notes: 'https://httpd.apache.org/security/' });
  });

  it.each([
    ['vendor=fortinet', ['CVE-2024-0001']],
    ['vendor=APACHE', ['CVE-2025-9999']],
    ['product=http_server', ['CVE-2025-9999']],
    ['product=HTTP Server', ['CVE-2025-9999']],
    ['product=apache:http_server', ['CVE-2025-9999']],
    ['product=fortinet:http_server', []],
    ['ransomware=known', ['CVE-2024-0001']],
    ['ransomware=unknown', ['CVE-2025-9999']],
    ['added_after=2025-01-10', ['CVE-2025-9999']],
    ['added_before=2025-01-10', ['CVE-2024-0001']],
    ['due_before=2030-01-01', ['CVE-2024-0001']],
    ['overdue=true', ['CVE-2024-0001']],
    ['overdue=false', ['CVE-2025-9999']],
  ])('filters with %s', async (query, expected) => {
    const { res, body, ids } = await list(query);
    expect(res.status).toBe(200);
    expect(ids).toEqual(expected);
    expect(body.count).toBe(expected.length);
  });

  it('sorts by date added and due date', async () => {
    expect((await list('sort=date_added')).ids).toEqual(['CVE-2024-0001', 'CVE-2025-9999']);
    expect((await list('sort=-due_date')).ids).toEqual(['CVE-2025-9999', 'CVE-2024-0001']);
  });

  it.each([['ransomware=maybe'], ['overdue=1'], ['sort=cvss'], ['added_after=soon'], ['page_size=500']])('rejects %s', async query => {
    const { res, body } = await list(query);
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('validation_error');
  });

  it('needs kev:read', async () => {
    const res = await call('/v1/kev', { key: await apiKey(['catalog:read']) });
    expect(res.status).toBe(403);
    expect((await expectContract(res, 'GET', '/kev')).error.details.required_scope).toBe('kev:read');
  });
});

describe('GET /v1/kev/{cve_id}', () => {
  it('returns the entry with articles and threat actors when asked', async () => {
    const { res, body } = await detail('cve-2024-0001', 'include=articles,threat_actors');
    expect(res.status).toBe(200);
    expect(body.cve_id).toBe('CVE-2024-0001');
    expect(body.articles).toHaveLength(2);
    expect(body.threat_actors.map((a: any) => a.name)).toEqual(['Test Panda']);
  });

  it('leaves includes out unless asked', async () => {
    const { body } = await detail('CVE-2024-0001');
    expect(body).not.toHaveProperty('articles');
    expect(body).not.toHaveProperty('threat_actors');
  });

  it('returns 404 for a CVE not in KEV and 400 for bad input', async () => {
    expect((await detail('CVE-2024-0002')).res.status).toBe(404);
    expect((await detail('CVE-nope')).res.status).toBe(400);
    expect((await detail('CVE-2024-0001', 'include=references')).res.status).toBe(400);
  });
});
