import assert from 'node:assert/strict';
import {
  RESOURCE_TO_STORAGE_KEY_MAP,
  STORAGE_KEY_TO_RESOURCE_MAP,
  notifyStorageFromRefineResource,
  setupStorageToQueryBridge,
  registerCacheResourceMapping,
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
  assert.equal(RESOURCE_TO_STORAGE_KEY_MAP['instructors'], STORAGE_KEYS.TEACHERS);
  assert.equal(RESOURCE_TO_STORAGE_KEY_MAP['classes'], STORAGE_KEYS.CLASSES);
  assert.equal(RESOURCE_TO_STORAGE_KEY_MAP['attendance'], STORAGE_KEYS.ATTENDANCE);
  assert.equal(RESOURCE_TO_STORAGE_KEY_MAP['consultations'], STORAGE_KEYS.CONSULTATIONS);
  assert.equal(RESOURCE_TO_STORAGE_KEY_MAP['billing_invoices'], STORAGE_KEYS.INVOICES);
  assert.equal(RESOURCE_TO_STORAGE_KEY_MAP['inventory_items'], STORAGE_KEYS.TEXTBOOKS);
  assert.equal(RESOURCE_TO_STORAGE_KEY_MAP['seat_rooms'], STORAGE_KEYS.PRACTICE_ROOM_BOOKINGS);
  assert.equal(RESOURCE_TO_STORAGE_KEY_MAP['simple_ledgers'], STORAGE_KEYS.EXPENSES);
  assert.equal(RESOURCE_TO_STORAGE_KEY_MAP['daily_care_logs'], STORAGE_KEYS.CARE_JOURNALS);
  assert.equal(RESOURCE_TO_STORAGE_KEY_MAP['care_timeline_entries'], STORAGE_KEYS.CARE_CHILD_RECORDS);
  assert.equal(RESOURCE_TO_STORAGE_KEY_MAP['achievement_quests'], STORAGE_KEYS.ACHIEVEMENTS);

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

  // 5. Capability-specific storage change -> TanStack Query invalidation
  client.invalidations.length = 0;
  (StorageService as any).notify(STORAGE_KEYS.ATTENDANCE);
  assert.ok(
    client.invalidations.some((inv: any) => inv.queryKey && inv.queryKey[0] === 'attendance'),
    'queryClient must invalidate attendance query on ATTENDANCE change'
  );

  client.invalidations.length = 0;
  (StorageService as any).notify(STORAGE_KEYS.EXPENSES);
  assert.ok(
    client.invalidations.some((inv: any) => inv.queryKey && inv.queryKey[0] === 'simple_ledgers'),
    'queryClient must invalidate simple_ledgers query on EXPENSES change'
  );

  // 6. Dynamic registration via registerCacheResourceMapping
  registerCacheResourceMapping('custom_kiosk_items', STORAGE_KEYS.NOTIFICATIONS);
  assert.equal(RESOURCE_TO_STORAGE_KEY_MAP['custom_kiosk_items'], STORAGE_KEYS.NOTIFICATIONS);
  assert.ok(
    STORAGE_KEY_TO_RESOURCE_MAP[STORAGE_KEYS.NOTIFICATIONS]?.includes('custom_kiosk_items')
  );

  client.invalidations.length = 0;
  (StorageService as any).notify(STORAGE_KEYS.NOTIFICATIONS);
  assert.ok(
    client.invalidations.some((inv: any) => inv.queryKey && inv.queryKey[0] === 'custom_kiosk_items'),
    'queryClient must invalidate dynamically registered custom_kiosk_items query'
  );

  // 7. Cleanup bridge removes listener
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
