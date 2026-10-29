/**
 * 실행: npx tsx src/domain/permissions.orgStructure.test.ts
 */
import assert from 'node:assert/strict';
import { canManageOrgStructure, canManageRoles } from './permissions';

assert.equal(canManageOrgStructure({ role: 'owner' }), true);
assert.equal(canManageOrgStructure({ role: 'manager' }), true);
assert.equal(canManageOrgStructure({ role: 'admin' }), true);
assert.equal(canManageOrgStructure({ role: 'staff' }), false);
assert.equal(
  canManageOrgStructure({
    role: 'staff',
    customRole: { permissions: { 'org_structure:manage': true } },
  }),
  true,
);
assert.equal(
  canManageOrgStructure({
    role: 'staff',
    permissions: { 'roles:assign': true },
  }),
  false,
);
assert.equal(
  canManageRoles({
    role: 'staff',
    customRole: { permissions: { 'roles:assign': true } },
  }),
  true,
);

console.log('permissions.orgStructure.test.ts: ok');
