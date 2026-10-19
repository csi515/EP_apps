import assert from 'node:assert/strict';
import {
  EMPTY_ROLE_PERMISSIONS,
  evaluateMemberAccess,
  normalizeRolePermissions,
  type RolePermissionMap,
} from './permissions';

const financeOn: RolePermissionMap = {
  ...EMPTY_ROLE_PERMISSIONS,
  billing_invoices: true,
  attendance: true,
  booking: false,
  passes: false,
  statistics: true,
};

const financeOff: RolePermissionMap = { ...financeOn, billing_invoices: false, statistics: false };

assert.equal(
  evaluateMemberAccess({ role: 'owner', customRole: { permissions: financeOff } }, 'billing_invoices', 'read'),
  true
);

assert.equal(
  evaluateMemberAccess({ role: 'staff', customRole: { permissions: financeOn } }, 'billing_invoices', 'read'),
  true
);
assert.equal(
  evaluateMemberAccess({ role: 'staff', customRole: { permissions: financeOff } }, 'billing_invoices', 'read'),
  false
);
assert.equal(
  evaluateMemberAccess({ role: 'staff', customRole: { permissions: financeOn } }, 'statistics', 'list'),
  true
);
assert.equal(
  evaluateMemberAccess({ role: 'staff', customRole: { permissions: financeOff } }, 'statistics', 'list'),
  false
);

assert.equal(evaluateMemberAccess({ role: 'staff', customRole: null }, 'attendance', 'write'), true);
assert.equal(evaluateMemberAccess({ role: 'staff', customRole: null }, 'billing_invoices', 'read'), false);
assert.equal(evaluateMemberAccess({ role: 'staff', customRole: null }, 'booking', 'read'), true);
assert.equal(evaluateMemberAccess({ role: 'staff', customRole: null }, 'booking', 'write'), false);

const legacy = normalizeRolePermissions({
  billing_invoices: false,
  attendance: true,
  booking: true,
  passes: true,
  statistics: false,
  members_manage: false,
  policies: false,
});
assert.ok(legacy);
assert.equal(legacy.resources_manage, false);
assert.equal(legacy.grievances_manage, false);

const ga: RolePermissionMap = { ...EMPTY_ROLE_PERMISSIONS, resources_manage: true, booking: true };
assert.equal(evaluateMemberAccess({ role: 'staff', customRole: { permissions: ga } }, 'resources_manage', 'write'), true);
assert.equal(
  evaluateMemberAccess({ role: 'staff', customRole: { permissions: EMPTY_ROLE_PERMISSIONS } }, 'resources_manage', 'write'),
  false
);
assert.equal(
  evaluateMemberAccess({ role: 'staff', customRole: { permissions: { ...EMPTY_ROLE_PERMISSIONS, grievances_manage: true } } }, 'grievances_manage', 'read'),
  true
);

console.log('permissions.invariant.test.ts: ok');
