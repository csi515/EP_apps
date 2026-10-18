import assert from 'node:assert/strict';
import {
  createTenantQueryKey,
  registerTenantQueryClear,
  evictTenantMemoryCache,
  setTenantQueryClient,
} from './tenantQueryKeys';

async function runTests() {
  // 1. Tenant Query Key generation
  const key1 = createTenantQueryKey('org-123', 'customers', 'list', { page: 1 });
  assert.deepEqual(key1, ['tenant', 'org:org-123', 'customers', 'list', { page: 1 }]);

  const key2 = createTenantQueryKey('org-456', 'customers', 'list', { page: 1 });
  assert.deepEqual(key2, ['tenant', 'org:org-456', 'customers', 'list', { page: 1 }]);

  // Must not collide across different orgs!
  assert.notDeepEqual(key1, key2);

  // Unscoped key
  const keyUnscoped = createTenantQueryKey(null, 'public_catalog');
  assert.deepEqual(keyUnscoped, ['tenant', 'org:__none__', 'public_catalog']);

  // 2. Cache eviction coordinator
  let clearCallCount = 0;
  let clientClearCalled = false;
  let clientCancelCalled = false;
  let mutationClearCalled = false;

  const mockQueryClient = {
    clear: () => {
      clientClearCalled = true;
    },
    cancelQueries: async () => {
      clientCancelCalled = true;
    },
    getMutationCache: () => ({
      clear: () => {
        mutationClearCalled = true;
      },
    }),
  } as any;

  setTenantQueryClient(mockQueryClient);

  const unregister = registerTenantQueryClear(() => {
    clearCallCount++;
  });

  evictTenantMemoryCache();
  assert.equal(clearCallCount, 1, 'Clear handler must be triggered');
  assert.equal(clientClearCalled, true, 'queryClient.clear() must be triggered');
  assert.equal(clientCancelCalled, true, 'queryClient.cancelQueries() must be triggered');
  assert.equal(mutationClearCalled, true, 'mutationCache.clear() must be triggered');

  // After unregistering
  unregister();
  evictTenantMemoryCache();
  assert.equal(clearCallCount, 1, 'Unregistered handler must not be triggered again');

  console.log('tenantQueryKeys tests passed!');
}

void runTests();
