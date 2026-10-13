import assert from 'node:assert/strict';
import {
  RESOURCE_TO_STORAGE_KEY_MAP,
  STORAGE_KEY_TO_RESOURCE_MAP,
  notifyStorageFromRefineResource,
  setupStorageToQueryBridge,
} from './crossCacheBridge';
import { STORAGE_KEYS, type StorageKey } from '@/services/adapters/storageKeys';
import { StorageService } from '@/services/storage';
import { setTenantQueryClient } from './tenantQueryKeys';

function mockQueryClient() {
  const invalidations: any[] = [];
  return {
    invalidations,
    invalidateQueries: (params: any) => {
      invalidations.push(params);
      return Promise.resolve();
    },
    clear: () => {},
  } as any;
}

async function runCrossCacheBridgeTests() {
  console.log('Running crossCacheBridge unit & integration tests...');

  // 1. Mapping table consistency
  assert.equal(RESOURCE_TO_STORAGE_KEY_MAP['customers'], STORAGE_KEYS.STUDENTS);
  assert.equal(RESOURCE_TO_STORAGE_KEY_MAP['schedules'], STORAGE_KEYS.SCHEDULES);
  assert.equal(RESOURCE_TO_STORAGE_KEY_MAP['passes'], STORAGE_KEYS.SESSION_PASSES);
  assert.equal(RESOURCE_TO_STORAGE_KEY_MAP['session_passes'], STORAGE_KEYS.SESSION_PASSES);
  assert.equal(RESOURCE_TO_STORAGE_KEY_MAP['lockers'], STORAGE_KEYS.LOCKERS);
  assert.equal(RESOURCE_TO_STORAGE_KEY_MAP['tuition_invoices'], STORAGE_KEYS.INVOICES);
  assert.equal(RESOURCE_TO_STORAGE_KEY_MAP['staff'], STORAGE_KEYS.TEACHERS);
  assert.equal(RESOURCE_TO_STORAGE_KEY_MAP['classes'], STORAGE_KEYS.CLASSES);

  // 2. Refine resource CUD -> StorageService notify propagation
  const notifiedKeys: StorageKey[] = [];
  const unsubscribeSpy = StorageService.subscribe((key) => {
    if (key !== '*') {
      notifiedKeys.push(key as StorageKey);
    }
  });

  notifyStorageFromRefineResource('customers');
  notifyStorageFromRefineResource('passes');
  notifyStorageFromRefineResource('lockers');
  notifyStorageFromRefineResource('unknown_resource'); // should safely ignore

  unsubscribeSpy();

  assert.deepEqual(notifiedKeys, [
    STORAGE_KEYS.STUDENTS,
    STORAGE_KEYS.SESSION_PASSES,
    STORAGE_KEYS.LOCKERS,
  ]);

  // 3. StorageService change -> TanStack Query invalidation bridge
  const client = mockQueryClient();
  setTenantQueryClient(client);

  const cleanupBridge = setupStorageToQueryBridge(client, () => 'org-123');

  // Trigger StorageService notify for STUDENTS
  (StorageService as any).notify(STORAGE_KEYS.STUDENTS);

  // Expect queryClient.invalidateQueries({ queryKey: ['customers'] })
  assert.ok(
    client.invalidations.some(
      (inv: any) => inv.queryKey && inv.queryKey[0] === 'customers'
    ),
    'queryClient must invalidate customers query on STUDENTS change'
  );

  // Trigger StorageService notify for LOCKERS
  client.invalidations.length = 0;
  (StorageService as any).notify(STORAGE_KEYS.LOCKERS);

  assert.ok(
    client.invalidations.some(
      (inv: any) => inv.queryKey && inv.queryKey[0] === 'lockers'
    ),
    'queryClient must invalidate lockers query on LOCKERS change'
  );

  // Trigger StorageService notify for SCHEDULES
  client.invalidations.length = 0;
  (StorageService as any).notify(STORAGE_KEYS.SCHEDULES);

  assert.ok(
    client.invalidations.some(
      (inv: any) => inv.queryKey && inv.queryKey[0] === 'schedules'
    ),
    'queryClient must invalidate schedules query on SCHEDULES change'
  );
  assert.ok(
    client.invalidations.some(
      (inv: any) => inv.queryKey && inv.queryKey[0] === 'bookings'
    ),
    'queryClient must invalidate bookings query on SCHEDULES change'
  );

  // 4. Wildcard '*' (full hydrate) invalidation
  client.invalidations.length = 0;
  (StorageService as any).notify('*');

  const invalidatedResources = client.invalidations
    .filter((inv: any) => inv.queryKey)
    .map((inv: any) => inv.queryKey[0]);

  assert.ok(invalidatedResources.includes('customers'));
  assert.ok(invalidatedResources.includes('schedules'));
  assert.ok(invalidatedResources.includes('tuition_invoices'));

  // 5. Cleanup bridge removes listener
  cleanupBridge();
  client.invalidations.length = 0;
  (StorageService as any).notify(STORAGE_KEYS.STUDENTS);
  assert.equal(client.invalidations.length, 0, 'No invalidations after bridge cleanup');

  console.log('[test:cross-cache-bridge] all assertions passed successfully!');
}

runCrossCacheBridgeTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
