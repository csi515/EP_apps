import assert from 'node:assert';
import {
  timeToMinutes,
  isTimeOverlapping,
  isSlotBlocked,
  validateScheduleConstraints,
  StaffShiftConstraint,
  RoomConstraint,
  PassConstraint,
  BookingCandidate,
  ExistingBookingSlot,
} from './calendarConstraintEngine';

console.log('--- Testing calendarConstraintEngine ---');

// Test 1: timeToMinutes and isTimeOverlapping
assert.strictEqual(timeToMinutes('09:30'), 570);
assert.strictEqual(timeToMinutes('14:00'), 840);

assert.strictEqual(isTimeOverlapping('10:00', '11:00', '10:30', '11:30'), true);
assert.strictEqual(isTimeOverlapping('10:00', '11:00', '11:00', '12:00'), false); // contiguous, no overlap
assert.strictEqual(isTimeOverlapping('14:00', '15:00', '13:00', '16:00'), true);
console.log('✅ Test 1 passed: Time calculations and overlap');

// Test 2: isSlotBlocked for shifts
const testShift: StaffShiftConstraint = {
  staffId: 'staff-1',
  date: '2026-10-20',
  workStart: '09:00',
  workEnd: '18:00',
  breakStart: '12:00',
  breakEnd: '13:00',
  isDayOff: false,
};

assert.strictEqual(isSlotBlocked('08:30', testShift).isBlocked, true); // before work
assert.strictEqual(isSlotBlocked('10:00', testShift).isBlocked, false); // normal
assert.strictEqual(isSlotBlocked('12:30', testShift).isBlocked, true); // break time
assert.strictEqual(isSlotBlocked('18:00', testShift).isBlocked, true); // after work

const dayOffShift: StaffShiftConstraint = {
  ...testShift,
  isDayOff: true,
};
assert.strictEqual(isSlotBlocked('10:00', dayOffShift).isBlocked, true);
console.log('✅ Test 2 passed: Slot blocking logic for staff shifts');

// Test 3: validateScheduleConstraints - staff shift conflicts
const cand1: BookingCandidate = {
  memberId: 'm-1',
  staffId: 'staff-1',
  roomId: 'room-A',
  date: '2026-10-20',
  startTime: '12:00',
  endTime: '13:00',
};

const res1 = validateScheduleConstraints(cand1, {
  staffShifts: [testShift],
});
assert.strictEqual(res1.isValid, false);
assert.strictEqual(res1.violations[0].type, 'STAFF_ON_BREAK');
console.log('✅ Test 3 passed: Staff break conflict detection');

// Test 4: validateScheduleConstraints - room double booking
const existingBookings: ExistingBookingSlot[] = [
  {
    id: 'b-1',
    memberId: 'm-2',
    roomId: 'room-A',
    staffId: 'staff-2',
    date: '2026-10-20',
    startTime: '14:00',
    endTime: '15:00',
    status: 'confirmed',
  },
];

const candOverlapRoom: BookingCandidate = {
  memberId: 'm-1',
  staffId: 'staff-1',
  roomId: 'room-A',
  date: '2026-10-20',
  startTime: '14:30',
  endTime: '15:30',
};

const resOverlapRoom = validateScheduleConstraints(candOverlapRoom, {
  staffShifts: [testShift],
  existingBookings,
});
assert.strictEqual(resOverlapRoom.isValid, false);
assert.strictEqual(resOverlapRoom.violations.some((v) => v.type === 'ROOM_DOUBLE_BOOKED'), true);
console.log('✅ Test 4 passed: Room double booking conflict detection');

// Test 5: validateScheduleConstraints - pass expiry / exhaustion
const expiredPass: PassConstraint = {
  passId: 'p-1',
  memberId: 'm-1',
  remainingCount: 5,
  expiryDate: '2026-10-15', // expired before 2026-10-20
  status: 'active',
};

const resExpired = validateScheduleConstraints(cand1, {
  staffShifts: [{ ...testShift, breakStart: undefined, breakEnd: undefined }],
  memberPasses: [expiredPass],
});
assert.strictEqual(resExpired.isValid, false);
assert.strictEqual(resExpired.violations.some((v) => v.type === 'PASS_EXPIRED'), true);

const exhaustedPass: PassConstraint = {
  passId: 'p-2',
  memberId: 'm-1',
  remainingCount: 0,
  expiryDate: '2026-10-30',
  status: 'active',
};
const resExhausted = validateScheduleConstraints(cand1, {
  staffShifts: [{ ...testShift, breakStart: undefined, breakEnd: undefined }],
  memberPasses: [exhaustedPass],
});
assert.strictEqual(resExhausted.isValid, false);
assert.strictEqual(resExhausted.violations.some((v) => v.type === 'PASS_EXHAUSTED'), true);

// Test 6: Clean valid case
const validPass: PassConstraint = {
  passId: 'p-3',
  memberId: 'm-1',
  remainingCount: 10,
  expiryDate: '2026-10-31',
  status: 'active',
};
const validCand: BookingCandidate = {
  memberId: 'm-1',
  staffId: 'staff-1',
  roomId: 'room-B',
  date: '2026-10-20',
  startTime: '10:00',
  endTime: '11:00',
};
const resValid = validateScheduleConstraints(validCand, {
  staffShifts: [testShift],
  existingBookings,
  memberPasses: [validPass],
});
assert.strictEqual(resValid.isValid, true);
assert.strictEqual(resValid.violations.length, 0);
console.log('✅ Test 5 & 6 passed: Pass constraints and valid booking validation');

console.log('🎉 All calendarConstraintEngine tests passed!');
