/**
 * 실행: npx tsx src/services/adapters/storageContext.test.ts
 */
import assert from 'node:assert/strict';
import { STORAGE_KEYS } from './storageKeys';
import {
  isDeviceOnlyStorageKey,
  resolveStorageKey,
  setOrganizationId,
} from './storageContext';

setOrganizationId('22222222-2222-4222-8222-222222222222');

assert.equal(
  isDeviceOnlyStorageKey(STORAGE_KEYS.ACTIVE_USER),
  true,
  'ACTIVE_USER is device-only'
);
assert.equal(
  resolveStorageKey(STORAGE_KEYS.ACTIVE_USER),
  STORAGE_KEYS.ACTIVE_USER,
  'ACTIVE_USER must not be org-suffixed (MBO deny / role gate SoT)'
);
assert.equal(
  resolveStorageKey(STORAGE_KEYS.SETTINGS),
  `${STORAGE_KEYS.SETTINGS}_22222222-2222-4222-8222-222222222222`,
  'business settings stay org-scoped'
);

setOrganizationId(null);
assert.equal(resolveStorageKey(STORAGE_KEYS.SETTINGS), STORAGE_KEYS.SETTINGS);

console.log('storageContext.test.ts: ok');
