import { createRoute, z, type RouteHandler } from '@hono/zod-openapi';
import type { ApiEnv } from '../app.js';

// GET /v1/ping: a cheap check that the API is reachable. No auth and no database.

const PingResponse = z.object({
  status: z.literal('ok'),
  version: z.literal('v1'),
  time: z.string().datetime().openapi({ example: '2026-11-23T08:00:00.000Z' }),
}).openapi('Ping');

export const pingRoute = createRoute({
  method: 'get',
  path: '/ping',
  tags: ['Meta'],
  summary: 'Check that the API is reachable',
  responses: {
    200: { description: 'The API is up', content: { 'application/json': { schema: PingResponse } } },
  },
});

export const pingHandler: RouteHandler<typeof pingRoute, ApiEnv> = c => {
  c.header('Cache-Control', 'no-store');
  return c.json({ status: 'ok' as const, version: 'v1' as const, time: new Date().toISOString() }, 200);
};
