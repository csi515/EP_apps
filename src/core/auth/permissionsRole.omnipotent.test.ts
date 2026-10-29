/**
 * 실행: npx tsx src/core/auth/permissionsRole.omnipotent.test.ts
 */
import assert from 'node:assert/strict';
import { isOmnipotentOrgRole, isOrgAdmin } from './permissionsRole';
import {
  canManageRoles,
  canManageOrgStructure,
  evaluateMemberAccess,
  getCallerEffectivePermissions,
  ROLE_PERMISSION_KEYS,
} from '@/domain/permissions';

assert.equal(isOmnipotentOrgRole('owner'), true);
assert.equal(isOmnipotentOrgRole('admin'), true);
assert.equal(isOmnipotentOrgRole('director'), true);
assert.equal(isOmnipotentOrgRole('super_admin'), true);
assert.equal(isOmnipotentOrgRole('manager'), false);
assert.equal(isOrgAdmin('manager'), true);

for (const role of ['owner', 'admin', 'director', 'super_admin'] as const) {
  const perms = getCallerEffectivePermissions({ role });
  for (const key of ROLE_PERMISSION_KEYS) {
    assert.equal(perms[key], true, `${role} must have ${key}`);
  }
  assert.equal(canManageRoles({ role }), true);
  assert.equal(canManageOrgStructure({ role }), true);
  assert.equal(evaluateMemberAccess({ role }, 'billing_invoices', 'read'), true);
  assert.equal(
    evaluateMemberAccess(
      { role, customRole: { permissions: { billing_invoices: false } } },
      'billing_invoices',
      'read',
    ),
    true,
    `${role} bypasses limited customRole`,
  );
}

assert.equal(canManageRoles({ role: 'manager' }), false);
assert.equal(canManageOrgStructure({ role: 'manager' }), true);

console.log('permissionsRole.omnipotent.test.ts: ok');
