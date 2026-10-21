import assert from 'node:assert/strict';
import {
  canManageVolunteerActivity,
  deriveVolunteerStatusAfterCount,
  isVolunteerJoinAllowed,
  remainingVolunteerSlots,
  validateVolunteerActivityDraft,
} from './volunteerActivityEngine';

assert.equal(canManageVolunteerActivity({ role: 'owner' }), true);
assert.equal(canManageVolunteerActivity({ role: 'staff', permissions: {} }), false);
assert.equal(
  canManageVolunteerActivity({ role: 'staff', permissions: { 'volunteer:manage': true } }),
  true
);

assert.equal(validateVolunteerActivityDraft({ title: '', activityType: 'a', capacity: 5 }).isValid, false);
assert.equal(
  validateVolunteerActivityDraft({ title: '환경 정화', activityType: 'cleanup', capacity: 10 }).isValid,
  true
);

assert.equal(isVolunteerJoinAllowed({ status: 'open', capacity: 3, signupCount: 2 }), true);
assert.equal(isVolunteerJoinAllowed({ status: 'open', capacity: 3, signupCount: 3 }), false);
assert.equal(isVolunteerJoinAllowed({ status: 'closed', capacity: 3, signupCount: 2 }), false);

assert.equal(remainingVolunteerSlots(10, 7), 3);
assert.equal(deriveVolunteerStatusAfterCount(5, 5, 'open'), 'closed');
assert.equal(deriveVolunteerStatusAfterCount(5, 4, 'closed'), 'open');
assert.equal(deriveVolunteerStatusAfterCount(5, 4, 'cancelled'), 'cancelled');

console.log('volunteerActivityEngine.test.ts: ok');
