import { beforeAll, describe, expect, it } from 'vitest';
import { useTestDb } from '../helpers/db.js';
import { apiKey, call } from '../helpers/request.js';
import { expectContract } from '../helpers/contract.js';
import { r2 } from '../helpers/r2.js';
import { ARTICLE_ID, SEEDED_CVE_COUNT } from '../helpers/seed.js';

useTestDb();

let key: string;
beforeAll(async () => { key = await apiKey(); });

async function list(query = '') {
  const res = await call(`/v1/cves${query ? `?${query}` : ''}`, { key });
  const body = await expectContract(res, 'GET', '/cves');
  return { res, body, ids: res.status === 200 ? body.results.map((r: any) => r.cve_id) : [] };
}

async function detail(id: string, query = '') {
  const res = await call(`/v1/cves/${id}${query ? `?${query}` : ''}`, { key });
  return { res, body: await expectContract(res, 'GET', '/cves/{id}') };
}

describe('GET /v1/cves', () => {
  it('lists every CVE, newest first, with an estimated unfiltered count', async () => {
    const { res, body, ids } = await list();
    expect(res.status).toBe(200);
    expect(ids).toEqual(['CVE-2024-0006', 'CVE-2024-0004', 'CVE-2024-0003', 'CVE-2024-0002', 'CVE-2024-0001', 'CVE-2023-0005']);
    expect(body.count).toBe(SEEDED_CVE_COUNT);
    expect(body.count_estimated).toBe(true);
    expect(res.headers.get('cache-control')).toBe('private, max-age=60');
  });

  it('picks the best score: NVD 3.x, then CISA 3.x, then CNA 4.0, then NVD 2.0', async () => {
    const { body } = await list();
    const byId = Object.fromEntries(body.results.map((r: any) => [r.cve_id, r]));
    expect(byId['CVE-2024-0001'].cvss).toEqual({ score: 10, version: '3.1', severity: 'critical', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H', source: 'nvd' });
    expect(byId['CVE-2024-0003'].cvss).toMatchObject({ score: 7.5, source: 'cisa' });
    expect(byId['CVE-2024-0004'].cvss).toMatchObject({ score: 6.1, version: '4.0', source: 'cna' });
    expect(byId['CVE-2023-0005'].cvss).toMatchObject({ score: 5, version: '2.0', source: 'nvd' });
    expect(byId['CVE-2024-0006'].cvss).toBeNull();
  });

  it('returns each CWE once and the description without the products tail', async () => {
    const { body } = await list();
    const first = body.results.find((r: any) => r.cve_id === 'CVE-2024-0001');
    expect(first.weaknesses).toEqual(['CWE-287']);
    expect(first.description).toBe('An authentication bypass in FortiOS lets remote attackers gain admin access.');
    expect(first.title).toBe('Fortinet FortiOS Authentication Bypass Vulnerability');
    expect(first.is_kev).toBe(true);
    expect(first.epss).toEqual({ score: 0.94, percentile: 0.999 });
  });

  it('sorts by CVSS as numbers: 10 before 9.9, unscored last', async () => {
    expect((await list('sort=-cvss')).ids).toEqual(['CVE-2024-0001', 'CVE-2024-0002', 'CVE-2024-0003', 'CVE-2024-0004', 'CVE-2023-0005', 'CVE-2024-0006']);
    expect((await list('sort=cvss')).ids).toEqual(['CVE-2023-0005', 'CVE-2024-0004', 'CVE-2024-0003', 'CVE-2024-0002', 'CVE-2024-0001', 'CVE-2024-0006']);
  });

  it('sorts by CVSS within a filtered set too', async () => {
    expect((await list('vendor=apache&sort=-cvss')).ids).toEqual(['CVE-2024-0002', 'CVE-2024-0003']);
  });

  it('sorts by EPSS and modified date', async () => {
    expect((await list('sort=-epss')).ids.slice(0, 3)).toEqual(['CVE-2024-0001', 'CVE-2024-0002', 'CVE-2024-0003']);
    expect((await list('sort=modified')).ids[0]).toBe('CVE-2023-0005');
  });

  it.each([
    ['kev=true', ['CVE-2024-0001']],
    ['kev=false&vendor=apache', ['CVE-2024-0003', 'CVE-2024-0002']],
    ['vendor=fortinet', ['CVE-2024-0001']],
    ['product=http_server', ['CVE-2024-0003', 'CVE-2024-0002']],
    ['product=fortinet:fortios', ['CVE-2024-0001']],
    ['product=unknown_product', []],
    ['cwe=CWE-89', ['CVE-2024-0003']],
    ['cwe=287', ['CVE-2024-0001']],
    ['severity=critical', ['CVE-2024-0002', 'CVE-2024-0001']],
    ['severity=high,medium', ['CVE-2024-0004', 'CVE-2024-0003', 'CVE-2023-0005']],
    ['cvss_gte=9.95', ['CVE-2024-0001']],
    ['cvss_gte=6&cvss_lte=8', ['CVE-2024-0004', 'CVE-2024-0003']],
    ['epss_gte=0.5', ['CVE-2024-0002', 'CVE-2024-0001']],
    ['published_after=2024-06-01', ['CVE-2024-0006', 'CVE-2024-0004']],
    ['published_before=2024-01-01', ['CVE-2023-0005']],
    ['modified_after=2024-06-01', ['CVE-2024-0006', 'CVE-2024-0004', 'CVE-2024-0001']],
    ['search=sql injection', ['CVE-2024-0003']],
    ['search=forti', ['CVE-2024-0001']],
    ['search=apache&kev=true', []],
  ])('filters with %s', async (query, expected) => {
    const { res, body, ids } = await list(query);
    expect(res.status).toBe(200);
    expect(ids).toEqual(expected);
    expect(body.count).toBe(expected.length);
    expect(body.count_estimated).toBeUndefined();
  });

  it('pages with next and previous links that keep only route parameters', async () => {
    const first = await list('page_size=2&kev=false&host=api.whatcyber.com');
    expect(first.body.next).toBe('http://localhost/v1/cves?page_size=2&kev=false&page=2');
    // Two apache CVEs fill exactly one page of two: no next page.
    expect((await list('page_size=2&vendor=apache')).body.next).toBeNull();
    const page1 = await list('page_size=2');
    expect(page1.ids).toHaveLength(2);
    const page2 = await list('page_size=2&page=2');
    expect(page2.body.previous).toBe('http://localhost/v1/cves?page_size=2&page=1');
    expect(page2.ids).not.toContain(page1.ids[0]);
  });

  it.each([
    ['page_size=101', 'page_size'],
    ['page=0', 'page'],
    ['page=101&page_size=100', 'page'],
    ['severity=extreme', 'severity'],
    ['sort=name', 'sort'],
    ['cwe=XSS', 'cwe'],
    ['kev=yes', 'kev'],
    ['cvss_gte=8&cvss_lte=2', 'cvss_gte'],
    ['published_after=last-week', 'published_after'],
    ['search=!!', 'search'],
  ])('rejects %s', async (query, field) => {
    const { res, body } = await list(query);
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('validation_error');
    expect(body.error.details.fields.map((f: any) => f.field)).toContain(field);
  });
});

describe('GET /v1/cves/{id}', () => {
  const record = {
    description: 'Full description from the CVE record.',
    affectedProducts: [{ vendor: 'fortinet', product: 'fortios', versions: ['7.0.0 - 7.0.16'] }],
    references: [{ url: 'https://vendor.example/advisory', source: 'fortinet', tags: ['Vendor Advisory'] }],
  };

  it('returns the full record with every include', async () => {
    r2.records.set('CVE-2024-0001', record);
    const { res, body } = await detail('cve-2024-0001', 'include=references,articles,threat_actors');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, max-age=300');
    expect(body.cve_id).toBe('CVE-2024-0001');
    expect(body.partial).toBe(false);
    expect(body.description).toBe(record.description);
    expect(body.products).toEqual([{ vendor: 'fortinet', vendor_name: 'Fortinet', product: 'fortios', product_name: 'FortiOS', versions: ['7.0.0 - 7.0.16'] }]);
    expect(body.kev).toMatchObject({ date_added: '2024-03-05', due_date: '2024-03-26', known_ransomware_campaign_use: 'Known', notes: null });
    expect(body.ssvc).toMatchObject({ exploitation: 'active', automatable: 'yes', source: 'cisa' });
    expect(body.references).toEqual(record.references);
    expect(body.articles.map((a: any) => a.whatcyber_url)).toEqual([`https://www.whatcyber.com/article/${ARTICLE_ID}`, null]);
    // One entry per actor, preferring the high-confidence ATT&CK link, with markdown removed.
    expect(body.threat_actors).toHaveLength(1);
    expect(body.threat_actors[0]).toMatchObject({ name: 'Test Panda', source: 'attack', confidence: 'high', whatcyber_url: 'https://www.whatcyber.com/threat-actors/test-panda' });
    expect(body.threat_actors[0].evidence).not.toContain('](');
  });

  it('leaves out includes that were not asked for', async () => {
    r2.records.set('CVE-2024-0001', record);
    const { body } = await detail('CVE-2024-0001');
    expect(body).not.toHaveProperty('references');
    expect(body).not.toHaveProperty('articles');
    expect(body).not.toHaveProperty('threat_actors');
  });

  it('lists every score in metrics', async () => {
    const { body } = await detail('CVE-2024-0003');
    expect(body.metrics.cvss_v3).toEqual([{ score: 7.5, version: '3.1', severity: 'high', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N', source: 'cisa' }]);
    expect(body.kev).toBeNull();
  });

  it('falls back to Postgres fields with partial: true when R2 cannot be read', async () => {
    r2.failing = true;
    const { res, body } = await detail('CVE-2024-0001', 'include=references');
    expect(res.status).toBe(200);
    expect(body.partial).toBe(true);
    expect(body.description).toBe('An authentication bypass in FortiOS lets remote attackers gain admin access.');
    expect(body.references).toEqual([]);
  });

  it('returns 404 for an unknown CVE and 400 for a bad id or include', async () => {
    expect((await detail('CVE-2030-9999')).res.status).toBe(404);
    const badId = await detail('not-a-cve');
    expect(badId.res.status).toBe(400);
    expect(badId.body.error.code).toBe('validation_error');
    expect((await detail('CVE-2024-0001', 'include=exploits')).res.status).toBe(400);
  });
});
