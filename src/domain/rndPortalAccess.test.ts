/**
 * 실행: npx tsx src/domain/rndPortalAccess.test.ts
 */
import assert from 'node:assert/strict';
import { canAccessRndPortal } from './permissions';

assert.equal(canAccessRndPortal({ role: 'owner' }), true);
assert.equal(canAccessRndPortal({ role: 'admin' }), true);
assert.equal(
  canAccessRndPortal({
    role: 'staff',
    permissions: { 'rnd_portal:access': true },
  }),
  true
);
assert.equal(
  canAccessRndPortal({
    role: 'staff',
    permissions: { 'meal_survey:manage': true },
  }),
  false
);
assert.equal(
  canAccessRndPortal({
    role: 'staff',
    customRole: { permissions: { 'rnd_portal:access': true } },
  }),
  true
);

console.log('rndPortalAccess.test.ts: ok');
