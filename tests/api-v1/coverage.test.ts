import { describe, expect, it } from 'vitest';
import { ROUTES } from '../helpers/contract.js';

// Every route in the OpenAPI spec needs a contract test. When you add a route, add its tests
// (using expectContract) and then add it here.
const TESTED = [
  'GET /ping',
  'GET /account/keys',
  'POST /account/keys',
  'DELETE /account/keys/{id}',
  'GET /cves',
  'GET /cves/{id}',
];

describe('route coverage', () => {
  it('has a contract test for every route', () => {
    const routes = ROUTES.map(r => `${r.method.toUpperCase()} ${r.path}`).sort();
    expect(routes).toEqual([...TESTED].sort());
  });
});
