import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { readBody, toRequest } from '../../api/v1.js';

// api/v1.ts turns Vercel's Node request into a fetch Request. Vercel's helpers may already have
// read the body (req.body), which once made POSTs hang until a 504.

function fakeRequest(options: { method: string; url?: string; headers?: Record<string, string>; chunks?: string[]; body?: unknown; ended?: boolean }) {
  const req: any = Readable.from(options.chunks ?? []);
  req.method = options.method;
  req.url = options.url ?? '/api/v1/account/keys';
  req.headers = options.headers ?? {};
  if ('body' in options) req.body = options.body;
  if (options.ended) { req.resume(); Object.defineProperty(req, 'readableEnded', { value: true }); }
  return req;
}

describe('Vercel bridge', () => {
  it('uses a body Vercel already parsed, without waiting on the spent stream', async () => {
    const req = fakeRequest({ method: 'POST', body: { name: 'k' }, ended: true });
    expect((await readBody(req))?.toString()).toBe('{"name":"k"}');
  });

  it('reads the stream when nothing consumed it', async () => {
    const req = fakeRequest({ method: 'POST', chunks: ['{"na', 'me":"k"}'] });
    expect((await readBody(req))?.toString()).toBe('{"name":"k"}');
  });

  it('returns nothing for an empty, already-read body', async () => {
    const req = fakeRequest({ method: 'POST', ended: true });
    expect(await readBody(req)).toBeUndefined();
  });

  it('ignores bodies on GET', async () => {
    expect(await readBody(fakeRequest({ method: 'GET', chunks: ['x'] }))).toBeUndefined();
  });

  it('builds the public URL and drops length headers', async () => {
    const req = fakeRequest({
      method: 'POST', url: '/api/v1/account/keys?host=api.whatcyber.com', body: '{"name":"k"}', ended: true,
      headers: { 'x-forwarded-host': 'api.whatcyber.com', 'x-forwarded-proto': 'https', 'content-length': '99', 'content-type': 'application/json' },
    });
    const request = await toRequest(req);
    expect(request.url).toBe('https://api.whatcyber.com/api/v1/account/keys?host=api.whatcyber.com');
    expect(request.headers.get('content-length')).toBeNull();
    expect(await request.text()).toBe('{"name":"k"}');
  });
});
