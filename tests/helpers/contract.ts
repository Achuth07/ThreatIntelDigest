import { expect } from 'vitest';
import { z } from '@hono/zod-openapi';
import { createV1 } from '../../server/api-v1/app.js';
import { ErrorSchema } from '../../server/api-v1/lib/responses.js';

// Checks a response against the schema its route declares in the OpenAPI spec. Every object is
// made strict, so a field the schema does not list fails the test: the published contract and
// the code cannot drift apart unnoticed.

export function strict(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodObject) {
    const shape = Object.fromEntries(Object.entries(schema.shape as Record<string, z.ZodTypeAny>).map(([key, value]) => [key, strict(value)]));
    return z.object(shape).strict();
  }
  if (schema instanceof z.ZodArray) return z.array(strict(schema.element));
  if (schema instanceof z.ZodNullable) return strict(schema.unwrap()).nullable();
  if (schema instanceof z.ZodOptional) return strict(schema.unwrap()).optional();
  if (schema instanceof z.ZodDefault) return strict(schema._def.innerType);
  if (schema instanceof z.ZodUnion) return z.union(schema.options.map(strict) as [z.ZodTypeAny, z.ZodTypeAny]);
  return schema;
}

type RouteConfig = { method: string; path: string; responses: Record<string, { content?: Record<string, { schema: z.ZodTypeAny }> }> };

export const ROUTES: RouteConfig[] = createV1().openAPIRegistry.definitions
  .filter((d: any) => d.type === 'route')
  .map((d: any) => d.route);

const STRICT_ERROR = strict(ErrorSchema);

// path is the OpenAPI path, e.g. '/cves/{id}'. Returns the parsed body.
export async function expectContract(res: Response, method: string, path: string): Promise<any> {
  const route = ROUTES.find(r => r.method === method.toLowerCase() && r.path === path);
  if (!route) throw new Error(`No route ${method} ${path} in the OpenAPI registry`);
  const text = await res.clone().text();

  if (res.status >= 400) {
    // Errors always use the shared envelope, declared or not (429 and 503 come from middleware).
    const body = JSON.parse(text);
    assertParses(STRICT_ERROR, body, `${method} ${path} ${res.status}`);
    return body;
  }
  const declared = route.responses[String(res.status)];
  if (!declared) throw new Error(`${method} ${path} returned ${res.status}, which the route does not declare: ${text.slice(0, 300)}`);
  const schema = declared.content?.['application/json']?.schema;
  if (!schema) {
    expect(text, `${method} ${path} ${res.status} should have no body`).toBe('');
    return null;
  }
  const body = JSON.parse(text);
  assertParses(strict(schema), body, `${method} ${path} ${res.status}`);
  return body;
}

function assertParses(schema: z.ZodTypeAny, body: unknown, label: string) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues.map(i => `  ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
    throw new Error(`${label} does not match its schema:\n${issues}`);
  }
}
