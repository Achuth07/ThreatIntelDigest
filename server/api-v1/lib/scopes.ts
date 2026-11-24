import type { MiddlewareHandler } from 'hono';
import type { Scope } from '../api-keys.js';
import { errorBody } from './responses.js';

// Data routes need an API key with the right scope (WHA-45). The site's login token is only for
// /account routes, so a data request with one is refused like a missing key.
export function requireScope(scope: Scope): MiddlewareHandler<any> {
  return async (c, next) => {
    const identity = c.get('admin');
    if (!identity || identity.via !== 'key') {
      return c.json(errorBody(c, 'invalid_token', 'Data endpoints need an API key: "X-API-Key: wc_live_..." or "Authorization: Bearer wc_live_...". Create one in Settings.'), 401);
    }
    if (!identity.scopes?.includes(scope)) {
      return c.json(errorBody(c, 'insufficient_scope', `This API key does not have the ${scope} scope.`, { required_scope: scope }), 403);
    }
    await next();
  };
}
