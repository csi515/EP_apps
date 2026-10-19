import assert from 'node:assert/strict';
import { createTenantQueryKey, evictTenantMemoryCache, setTenantQueryClient } from '@/core/query/tenantQueryKeys';
import { switchOrganization } from './TenantContext';

const key = createTenantQueryKey('org-1', 'attendance', 'list');
assert.deepEqual(key.slice(0, 3), ['tenant', 'org:org-1', 'attendance']);
assert.notEqual(createTenantQueryKey('org-1', 'attendance')[1], createTenantQueryKey('org-2', 'attendance')[1]);

let cancelled = false;
let cleared = false;
setTenantQueryClient({
  cancelQueries: () => {
    cancelled = true;
  },
  clear: () => {
    cleared = true;
  },
  getMutationCache: () => ({ clear: () => undefined }),
  invalidateQueries: () => undefined,
} as never);

await switchOrganization();
assert.equal(cancelled, true);
assert.equal(cleared, true);
assert.equal(typeof evictTenantMemoryCache, 'function');

console.log('tenantIsolation.test.ts: ok');
