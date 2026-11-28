import { beforeAll, describe, expect, it } from 'vitest';
import { useTestDb } from '../helpers/db.js';
import { apiKey, call } from '../helpers/request.js';
import { expectContract } from '../helpers/contract.js';
import { ARTICLE_ID } from '../helpers/seed.js';

useTestDb();

let key: string;
beforeAll(async () => { key = await apiKey(['actors:read']); });

async function get(path: string, contractPath: string) {
  const res = await call(`/v1${path}`, { key });
  return { res, body: await expectContract(res, 'GET', contractPath) };
}
const list = async (query = '') => {
  const out = await get(`/threat-actors${query ? `?${query}` : ''}`, '/threat-actors');
  return { ...out, ids: out.res.status === 200 ? out.body.results.map((r: any) => r.id) : [] };
};

describe('GET /v1/threat-actors', () => {
  it('lists groups by name with counts and links, never internal ids', async () => {
    const { res, body, ids } = await list();
    expect(res.status).toBe(200);
    expect(ids).toEqual(['G0016', 'G9999']);
    const panda = body.results[1];
    expect(panda).toMatchObject({
      id: 'G9999', slug: 'test-panda', name: 'Test Panda', aliases: ['Bamboo Typhoon'],
      counts: { techniques: 1, software: 0, cves: 2, articles: 1 },
      links: { attack: 'https://attack.mitre.org/groups/G9999/', whatcyber: 'https://www.whatcyber.com/threat-actors/test-panda' },
    });
    expect(panda.latest_article_at).toBe('2024-03-04T08:00:00.000Z');
    expect(panda.description).toBe('Test Panda targets FortiOS devices.');
    expect(JSON.stringify(body)).not.toContain('1111-4111');
  });

  it.each([
    ['search=Cozy Bear', ['G0016']],
    ['search=cozy', ['G0016']],
    ['search=panda', ['G9999']],
    ['search=g0016', ['G0016']],
    ['search=100%25', []],
    ['technique=T1566', ['G0016']],
    ['technique=T1566.001', ['G0016']],
    ['technique=T1190', ['G9999']],
    ['technique=T1079', []],
    ['software=S0154', ['G0016']],
    ['software=mimikatz', ['G0016']],
    ['software=Cobalt Strike', ['G0016']],
    ['active_since=2024-03-01', ['G9999']],
    ['active_since=2024-03-05', []],
  ])('filters with %s', async (query, expected) => {
    const { res, body, ids } = await list(query);
    expect(res.status).toBe(200);
    expect(ids).toEqual(expected);
    expect(body.count).toBe(expected.length);
  });

  it('sorts by name, last update and latest article', async () => {
    expect((await list('sort=-name')).ids).toEqual(['G9999', 'G0016']);
    expect((await list('sort=-last_updated')).ids).toEqual(['G0016', 'G9999']);
    expect((await list('sort=-latest_article')).ids).toEqual(['G9999', 'G0016']);
  });

  it.each([['technique=phishing'], ['sort=cves'], ['search=a']])('rejects %s', async query => {
    expect((await list(query)).res.status).toBe(400);
  });

  it('needs actors:read', async () => {
    expect((await call('/v1/threat-actors', { key: await apiKey(['kev:read']) })).status).toBe(403);
  });
});

describe('GET /v1/threat-actors/{id}', () => {
  it('finds a group by ATT&CK id or slug, with full description and software', async () => {
    for (const id of ['G0016', 'g0016', 'apt29', 'APT29']) {
      const { res, body } = await get(`/threat-actors/${id}`, '/threat-actors/{id}');
      expect(res.status).toBe(200);
      expect(body.id).toBe('G0016');
    }
    const { body } = await get('/threat-actors/G0016', '/threat-actors/{id}');
    expect(body.description).toBe('APT29 is a threat group attributed to the SVR.');
    expect(body.aliases).toEqual(['Cozy Bear', 'NOBELIUM']);
    expect(body.software).toEqual([
      { id: 'S0154', name: 'Cobalt Strike', type: 'malware', url: 'https://attack.mitre.org/software/S0154/' },
      { id: 'S0002', name: 'Mimikatz', type: 'tool', url: 'https://attack.mitre.org/software/S0002/' },
    ]);
  });

  it('returns 404 for unknown groups and internal uuids', async () => {
    expect((await get('/threat-actors/G0000', '/threat-actors/{id}')).res.status).toBe(404);
    expect((await get('/threat-actors/11111111-1111-4111-8111-111111111111', '/threat-actors/{id}')).res.status).toBe(404);
  });
});

describe('threat actor sub-resources', () => {
  it('lists techniques in use, without revoked ones', async () => {
    const { body } = await get('/threat-actors/test-panda/techniques', '/threat-actors/{id}/techniques');
    expect(body.count).toBe(1);
    expect(body.results).toEqual([{
      id: 'T1190', name: 'Exploit Public-Facing Application', tactics: ['initial-access'], is_subtechnique: false,
      parent_id: null, procedure: 'Test Panda exploited FortiOS.', url: 'https://attack.mitre.org/techniques/T1190/',
    }]);
    const apt29 = await get('/threat-actors/G0016/techniques', '/threat-actors/{id}/techniques');
    expect(apt29.body.results[0]).toMatchObject({ id: 'T1566.001', parent_id: 'T1566', url: 'https://attack.mitre.org/techniques/T1566/001/', procedure: 'APT29 sent spearphishing attachments.' });
  });

  it('lists CVEs once each, strongest link first, with every source', async () => {
    const { body } = await get('/threat-actors/G9999/cves', '/threat-actors/{id}/cves');
    expect(body.count).toBe(2);
    expect(body.results.map((r: any) => [r.cve_id, r.confidence, r.sources])).toEqual([
      ['CVE-2024-0001', 'high', ['attack', 'news']],
      ['CVE-2025-9999', 'low', ['news']],
    ]);
    expect(body.results[0]).toMatchObject({ is_kev: true, severity: 'critical', published_at: '2024-03-01T10:00:00.000Z' });
    expect(body.results[0].evidence).not.toContain('](');
    // Not in the CVE table yet: no scores.
    expect(body.results[1]).toMatchObject({ cvss: null, published_at: null, is_kev: true });
  });

  it('lists articles from curated sources only', async () => {
    const { body } = await get('/threat-actors/G9999/articles', '/threat-actors/{id}/articles');
    expect(body.count).toBe(1);
    expect(body.results.map((a: any) => a.id)).toEqual([ARTICLE_ID]);
  });

  it('returns 404 for an unknown group on every sub-resource', async () => {
    for (const sub of ['articles', 'techniques', 'cves']) {
      expect((await get(`/threat-actors/nobody/${sub}`, `/threat-actors/{id}/${sub}`)).res.status).toBe(404);
    }
  });
});
