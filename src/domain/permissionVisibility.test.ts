import assert from 'node:assert/strict';
import {
  isPermissionKeyVisible,
  resolveActiveCapabilityIds,
} from './permissionVisibility';

assert.equal(isPermissionKeyVisible('roles:assign', []), true);
assert.equal(isPermissionKeyVisible('members:manage', []), true);
assert.equal(isPermissionKeyVisible('ownership:transfer', ['attendance']), false);
assert.equal(isPermissionKeyVisible('policies', []), true);

assert.equal(isPermissionKeyVisible('meal_survey:manage', ['meal_survey']), true);
assert.equal(isPermissionKeyVisible('meal_survey:manage', ['attendance', 'booking']), false);
assert.equal(isPermissionKeyVisible('office_supply_request:manage', ['office_supply_request']), true);
assert.equal(
  isPermissionKeyVisible('office_supply_request:manage', ['meal_survey', 'booking']),
  false
);
assert.equal(isPermissionKeyVisible('rnd_portal:access', ['research_project']), true);
assert.equal(isPermissionKeyVisible('rnd_portal:access', ['booking']), false);
assert.equal(isPermissionKeyVisible('volunteer:manage', ['volunteer_activity']), true);
assert.equal(isPermissionKeyVisible('volunteer:manage', ['piano']), false);

assert.equal(
  isPermissionKeyVisible('shuttle:manage', ['vehicle_shuttle']),
  true
);
assert.equal(
  isPermissionKeyVisible('shuttle:manage', ['shuttle_dispatch']),
  true
);
assert.equal(isPermissionKeyVisible('shuttle:manage', ['booking']), false);

assert.equal(
  isPermissionKeyVisible('resources_manage', ['seat_room']),
  true
);
assert.equal(
  isPermissionKeyVisible('grievances_manage', ['whistleblower_grievance']),
  true
);
assert.equal(isPermissionKeyVisible('grievances_manage', []), false);

assert.equal(
  isPermissionKeyVisible('billing_invoices', ['billing_invoicing']),
  true
);
assert.equal(isPermissionKeyVisible('statistics', ['billing']), true);
assert.equal(isPermissionKeyVisible('attendance', ['attendance']), true);
assert.equal(isPermissionKeyVisible('attendance', []), false);

const resolved = resolveActiveCapabilityIds(
  ['meal_survey', 'volunteer_activity', 'booking'],
  ['volunteer_activity']
);
assert.deepEqual(resolved.sort(), ['booking', 'meal_survey'].sort());
assert.equal(isPermissionKeyVisible('volunteer:manage', resolved), false);
assert.equal(isPermissionKeyVisible('meal_survey:manage', resolved), true);

console.log('permissionVisibility.test.ts: ok');
