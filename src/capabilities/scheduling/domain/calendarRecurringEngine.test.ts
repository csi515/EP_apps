import assert from 'node:assert';
import {
  expandRecurringSchedule,
  promoteNextWaitlist,
  RecurringScheduleRule,
  WaitlistEntry,
} from './calendarRecurringEngine';

console.log('--- Testing calendarRecurringEngine ---');

// Test 1: Weekly Tuesday/Thursday recurring 4 slots
const rule1: RecurringScheduleRule = {
  frequency: 'weekly',
  daysOfWeek: ['화', '목'],
  startDate: '2026-10-20', // 화요일
  startTime: '15:00',
  endTime: '16:00',
  count: 4,
  skipHolidays: false,
};

const slots1 = expandRecurringSchedule(rule1);
assert.strictEqual(slots1.length, 4);
assert.strictEqual(slots1[0].date, '2026-10-20');
assert.strictEqual(slots1[0].dayOfWeek, '화');
assert.strictEqual(slots1[1].date, '2026-10-22');
assert.strictEqual(slots1[1].dayOfWeek, '목');
assert.strictEqual(slots1[2].date, '2026-10-27');
assert.strictEqual(slots1[2].dayOfWeek, '화');
assert.strictEqual(slots1[3].date, '2026-10-29');
assert.strictEqual(slots1[3].dayOfWeek, '목');
console.log('✅ Test 1 passed: Weekly 2-days recurrence expansion');

// Test 2: Holiday skip and extension
// 만약 2026-10-22(목)이 공휴일이라면 해당 날짜는 스킵되고 다음 주 화(10-27), 목(10-29), 화(11-03)로 연장
const holidays = ['2026-10-22'];
const ruleWithHoliday: RecurringScheduleRule = {
  ...rule1,
  skipHolidays: true,
};

const slotsHoliday = expandRecurringSchedule(ruleWithHoliday, { holidays });
assert.strictEqual(slotsHoliday.length, 4);
assert.strictEqual(slotsHoliday[0].date, '2026-10-20'); // 화
assert.strictEqual(slotsHoliday[1].date, '2026-10-27'); // 10-22 스킵 -> 화
assert.strictEqual(slotsHoliday[2].date, '2026-10-29'); // 목
assert.strictEqual(slotsHoliday[3].date, '2026-11-03'); // 다음주 화
console.log('✅ Test 2 passed: Holiday skip and automatic roll-forward');

// Test 3: Until date limit
const ruleUntil: RecurringScheduleRule = {
  frequency: 'weekly',
  daysOfWeek: ['화', '목'],
  startDate: '2026-10-20',
  startTime: '15:00',
  endTime: '16:00',
  untilDate: '2026-10-25', // 10-20, 10-22만 포함되어야 함
};
const slotsUntil = expandRecurringSchedule(ruleUntil);
assert.strictEqual(slotsUntil.length, 2);
console.log('✅ Test 3 passed: Until date boundary restriction');

// Test 4: Waitlist promotion
const waitlists: WaitlistEntry[] = [
  {
    waitlistId: 'w-2',
    date: '2026-10-20',
    startTime: '15:00',
    memberId: 'm-2',
    memberName: '김이등',
    priority: 2,
    requestedAt: '2026-10-10T10:00:00Z',
    status: 'active',
  },
  {
    waitlistId: 'w-1',
    date: '2026-10-20',
    startTime: '15:00',
    memberId: 'm-1',
    memberName: '이일등',
    priority: 1,
    requestedAt: '2026-10-10T11:00:00Z',
    status: 'active',
  },
];

const promotion = promoteNextWaitlist({ date: '2026-10-20', startTime: '15:00' }, waitlists);
assert.strictEqual(promotion.hasPromoted, true);
assert.strictEqual(promotion.promotedEntry?.memberId, 'm-1');
assert.strictEqual(promotion.promotedEntry?.status, 'promoted');
assert.strictEqual(promotion.notificationMessage?.includes('이일등'), true);
console.log('✅ Test 4 passed: Priority-based waitlist promotion');

console.log('🎉 All calendarRecurringEngine tests passed!');
