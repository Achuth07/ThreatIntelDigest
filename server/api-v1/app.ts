import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import type { Context } from 'hono';
import { pingRoute, pingHandler } from './routes/ping.js';
import { getDb } from '../db.js';
import { authenticateAdmin, type AdminIdentity } from './auth.js';
import { registerAccountKeyRoutes } from './routes/account-keys.js';
import { ADMIN_LIMITS, IP_LIMITS, hashIp, hit, pruneOldWindows, rateLimitHeaders } from './rate-limit.js';

// Vercel sets x-real-ip and x-forwarded-for itself, so clients cannot choose their own address.
function clientIp(c: Context): string {
  return c.req.header('x-real-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

// The public v1 API (WHA-38): its own Vercel function (api/v1.ts), separate from the action-based
// handlers in api/index.ts. Routes, validation and the OpenAPI spec share one definition through
// @hono/zod-openapi. Route modules live in server/api-v1/routes/.

export type ApiEnv = { Variables: { requestId: string; admin: AdminIdentity } };

// Shared error body. WHA-39 extends this into the full error and pagination format.
export function errorBody(c: Context<ApiEnv>, code: string, message: string) {
  return { error: { code, message }, requestId: c.get('requestId') };
}

function createV1() {
  const v1 = new OpenAPIHono<ApiEnv>();
  v1.openapi(pingRoute, pingHandler);
  registerAccountKeyRoutes(v1);
  v1.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', { type: 'http', scheme: 'bearer' });
  v1.openAPIRegistry.registerComponent('securitySchemes', 'apiKeyHeader', { type: 'apiKey', in: 'header', name: 'X-API-Key' });
  v1.doc('/openapi.json', {
    openapi: '3.1.0',
    info: {
      title: 'WhatCyber API',
      version: '1.0.0',
      description: 'CVE, KEV, threat actor and news data from WhatCyber. Authenticate with an API key from Settings, as "Authorization: Bearer wc_live_..." or the X-API-Key header. Admin-only for now; limited to 30 requests a minute per IP, and 60 a minute and 1,000 a day per account.',
    },
    servers: [{ url: 'https://api.whatcyber.com/v1' }],
    security: [{ bearerAuth: [] }, { apiKeyHeader: [] }],
  });
  return v1;
}

export function createApp() {
  const app = new OpenAPIHono<ApiEnv>();

  // Every response carries an id to quote in support requests and logs.
  app.use('*', requestId({ generator: () => crypto.randomUUID() }));

  // Public, key-based API: any origin may call it from a browser. No cookies are used, so a
  // wildcard origin is safe. Clients can read the rate-limit and caching headers.
  app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'HEAD', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'X-API-Key', 'If-None-Match', 'Content-Type'],
    exposeHeaders: ['RateLimit', 'RateLimit-Policy', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'Retry-After', 'ETag', 'X-Request-Id'],
    maxAge: 86400,
  }));

  // API responses are data, not pages; keep them out of search results.
  app.use('*', async (c, next) => {
    await next();
    c.header('X-Robots-Tag', 'noindex');
  });

  // Strict rate limiting, then admin-only access. CORS preflights were answered above.
  app.use('*', async (c, next) => {
    const db = getDb();
    const send = (headers: Record<string, string>) => { for (const [key, value] of Object.entries(headers)) c.header(key, value); };
    try {
      const ipResults = await hit(db, `ip:${hashIp(clientIp(c))}`, IP_LIMITS);
      send(rateLimitHeaders(ipResults));
      if (ipResults.some(r => r.exceeded)) {
        return c.json(errorBody(c, 'rate_limited', 'Too many requests. Wait for the time in Retry-After.'), 429);
      }

      const auth = await authenticateAdmin(db, c.req.header('authorization'), c.req.header('x-api-key'));
      if (!auth.ok) return c.json(errorBody(c, auth.code, auth.message), auth.status);
      c.set('admin', auth.admin);

      const adminResults = await hit(db, `admin:${auth.admin.userId}`, ADMIN_LIMITS);
      const all = [...ipResults, ...adminResults];
      send(rateLimitHeaders(all));
      if (all.some(r => r.exceeded)) {
        return c.json(errorBody(c, 'rate_limited', 'Too many requests. Wait for the time in Retry-After.'), 429);
      }
      if (Math.random() < 0.01) pruneOldWindows(db).catch(error => console.error('[api-v1] rate limit cleanup failed', error));
    } catch (error) {
      // Without the counters there is no limit to enforce, so refuse rather than let requests through.
      console.error(`[api-v1] ${c.get('requestId')} access check failed`, error);
      return c.json(errorBody(c, 'unavailable', 'The API is not accepting requests right now.'), 503);
    }
    await next();
  });

  // api.whatcyber.com/v1/... in production; /api/v1/... on the main domain and in previews.
  const v1 = createV1();
  app.route('/v1', v1);
  app.route('/api/v1', v1);

  app.notFound(c => c.json(errorBody(c, 'not_found', `No route for ${c.req.method} ${new URL(c.req.url).pathname}`), 404));
  app.onError((error, c) => {
    console.error(`[api-v1] ${c.get('requestId')}`, error);
    return c.json(errorBody(c, 'internal_error', 'Something went wrong. Quote the request id if you contact us.'), 500);
  });

  return app;
}

export const app = createApp();
