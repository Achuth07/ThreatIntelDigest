import { createRoute, z, type OpenAPIHono } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { getDb } from '../../db.js';
import { MAX_ACTIVE_KEYS, READ_SCOPES, KeyLimitError, createKey, listKeys, revokeKey } from '../api-keys.js';
import { errorBody, type ApiEnv } from '../app.js';

// Key management for the signed-in user (WHA-46). Used by Settings with the site's session token.
// An API key cannot call these routes, so a leaked key cannot mint more keys or revoke others.

const ErrorSchema = z.object({ error: z.object({ code: z.string(), message: z.string() }), requestId: z.string() }).openapi('Error');

const KeySummary = z.object({
  id: z.string().uuid(),
  keyId: z.string().openapi({ description: 'Public part of the key, safe to show.' }),
  name: z.string(),
  scopes: z.array(z.enum(READ_SCOPES)),
  createdAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
}).openapi('ApiKey');

const CreateKeyBody = z.object({
  name: z.string().trim().min(1).max(60).openapi({ example: 'Splunk integration' }),
  scopes: z.array(z.enum(READ_SCOPES)).min(1).optional().openapi({ description: 'Defaults to every read scope.' }),
  expiresInDays: z.number().int().min(1).max(365).nullable().optional().openapi({ description: 'Leave out for a key that does not expire.' }),
});

const CreatedKey = z.object({
  key: z.string().openapi({ description: 'The full key. Shown only in this response; store it now.' }),
  apiKey: KeySummary,
}).openapi('CreatedApiKey');

const json = <T extends z.ZodTypeAny>(schema: T, description: string) => ({ description, content: { 'application/json': { schema } } });
const errors = { 401: json(ErrorSchema, 'Not signed in'), 403: json(ErrorSchema, 'Needs a session token, not an API key') };

const listRoute = createRoute({
  method: 'get', path: '/account/keys', tags: ['Account'], summary: 'List your active API keys',
  responses: { 200: json(z.object({ keys: z.array(KeySummary), maxActiveKeys: z.number() }), 'Your active keys'), ...errors },
});
const createKeyRoute = createRoute({
  method: 'post', path: '/account/keys', tags: ['Account'], summary: 'Create an API key',
  request: { body: { content: { 'application/json': { schema: CreateKeyBody } }, required: true } },
  responses: { 201: json(CreatedKey, 'The new key, shown once'), 400: json(ErrorSchema, 'Invalid request'), 409: json(ErrorSchema, 'Too many active keys'), ...errors },
});
const revokeRoute = createRoute({
  method: 'delete', path: '/account/keys/{id}', tags: ['Account'], summary: 'Revoke an API key',
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: { 204: { description: 'Revoked' }, 404: json(ErrorSchema, 'No such active key'), ...errors },
});

function requireSession(c: Context<ApiEnv>) {
  const admin = c.get('admin');
  return admin?.via === 'session' ? null : c.json(errorBody(c, 'session_required', 'Manage keys from Settings while signed in. API keys cannot manage keys.'), 403);
}

export function registerAccountKeyRoutes(v1: OpenAPIHono<ApiEnv>) {
  v1.openapi(listRoute, async c => {
    const denied = requireSession(c); if (denied) return denied as any;
    c.header('Cache-Control', 'no-store');
    return c.json({ keys: await listKeys(getDb(), c.get('admin').userId), maxActiveKeys: MAX_ACTIVE_KEYS }, 200);
  });

  v1.openapi(createKeyRoute, async c => {
    const denied = requireSession(c); if (denied) return denied as any;
    c.header('Cache-Control', 'no-store');
    const body = c.req.valid('json');
    try {
      const { key, summary } = await createKey(getDb(), c.get('admin').userId, body);
      console.log(`[api-v1] key ${summary.keyId} created for user ${c.get('admin').userId}`);
      return c.json({ key, apiKey: summary }, 201);
    } catch (error) {
      if (error instanceof KeyLimitError) return c.json(errorBody(c, 'key_limit', error.message), 409);
      throw error;
    }
  }, (result, c) => {
    if (!result.success) return c.json(errorBody(c as any, 'invalid_request', result.error.issues.map(i => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ')), 400);
  });

  v1.openapi(revokeRoute, async c => {
    const denied = requireSession(c); if (denied) return denied as any;
    const revoked = await revokeKey(getDb(), c.get('admin').userId, c.req.valid('param').id);
    if (!revoked) return c.json(errorBody(c, 'not_found', 'No active key with that id.'), 404);
    return c.body(null, 204);
  }, (result, c) => {
    if (!result.success) return c.json(errorBody(c as any, 'not_found', 'No active key with that id.'), 404);
  });
}
