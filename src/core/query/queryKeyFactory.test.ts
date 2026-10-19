import assert from 'node:assert/strict';
import { createTenantQueryKey } from './queryKeyFactory';

const key = createTenantQueryKey('org-1', 'customers', 'list', { page: 1 });
assert.deepEqual(key.slice(0, 4), ['tenant', 'org-1', 'customers', 'list']);
assert.throws(() => createTenantQueryKey('  ', 'customers', 'list'));

console.log('queryKeyFactory.test.ts: ok');
