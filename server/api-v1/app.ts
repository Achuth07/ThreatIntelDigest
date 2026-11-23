import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import type { Context } from 'hono';
import { pingRoute, pingHandler } from './routes/ping.js';

// The public v1 API (WHA-38): its own Vercel function (api/v1.ts), separate from the action-based
// handlers in api/index.ts. Routes, validation and the OpenAPI spec share one definition through
// @hono/zod-openapi. Route modules live in server/api-v1/routes/.

export type ApiEnv = { Variables: { requestId: string } };

// Shared error body. WHA-39 extends this into the full error and pagination format.
export function errorBody(c: Context<ApiEnv>, code: string, message: string) {
  return { error: { code, message }, requestId: c.get('requestId') };
}

function createV1() {
  const v1 = new OpenAPIHono<ApiEnv>();
  v1.openapi(pingRoute, pingHandler);
  v1.doc('/openapi.json', {
    openapi: '3.1.0',
    info: { title: 'WhatCyber API', version: '1.0.0', description: 'CVE, KEV, threat actor and news data from WhatCyber.' },
    servers: [{ url: 'https://api.whatcyber.com/v1' }],
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
    allowMethods: ['GET', 'HEAD', 'OPTIONS'],
    allowHeaders: ['Authorization', 'If-None-Match', 'Content-Type'],
    exposeHeaders: ['RateLimit', 'RateLimit-Policy', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'Retry-After', 'ETag', 'X-Request-Id'],
    maxAge: 86400,
  }));

  // API responses are data, not pages; keep them out of search results.
  app.use('*', async (c, next) => {
    await next();
    c.header('X-Robots-Tag', 'noindex');
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
