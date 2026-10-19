import assert from 'node:assert/strict';
import { evaluateMemberAccess, type RolePermissionMap } from './permissions';

const financeOn: RolePermissionMap = {
  billing_invoices: true,
  attendance: true,
  booking: false,
  passes: false,
  statistics: true,
  members_manage: false,
  policies: false,
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

console.log('permissions.invariant.test.ts: ok');
