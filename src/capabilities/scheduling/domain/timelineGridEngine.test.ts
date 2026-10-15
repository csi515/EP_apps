import assert from 'node:assert';
import {
  hhmmToMinutes,
  minutesToHhmm,
  computeEventPosition,
  snapMinutesToGrid,
  snapPercentToTime,
  computeResizedEndTime,
  calculateResourceOccupancy,
  TimelineConfig,
} from './timelineGridEngine';

console.log('--- Testing timelineGridEngine ---');

// Test 1: Minutes and HH:mm conversion
assert.strictEqual(hhmmToMinutes('09:00'), 540);
assert.strictEqual(hhmmToMinutes('13:45'), 825);
assert.strictEqual(minutesToHhmm(540), '09:00');
assert.strictEqual(minutesToHhmm(825), '13:45');
console.log('✅ Test 1 passed: Minutes and HH:mm conversions');

// Test 2: computeEventPosition on a 09:00 ~ 21:00 (12 hours = 720 minutes) timeline
const config12h: TimelineConfig = {
  startHour: 9,
  endHour: 21,
  slotIntervalMinutes: 30,
};

// Event 09:00 ~ 12:00 (3 hours = 25% of timeline, offset = 0%)
const pos1 = computeEventPosition('09:00', '12:00', config12h);
assert.strictEqual(pos1.leftPercent, 0);
assert.strictEqual(pos1.widthPercent, 25);
assert.strictEqual(pos1.durationMinutes, 180);

// Event 15:00 ~ 17:00 (starts at 6h out of 12h = 50%, duration 2h = 16.67%)
const pos2 = computeEventPosition('15:00', '17:00', config12h);
assert.strictEqual(pos2.leftPercent, 50);
assert.strictEqual(pos2.widthPercent, 16.67);
console.log('✅ Test 2 passed: Timeline position percent calculations');

// Test 3: Snap minutes and percent to grid
assert.strictEqual(snapMinutesToGrid(547, 15), 540); // 09:07 -> 09:00
assert.strictEqual(snapMinutesToGrid(550, 15), 555); // 09:10 -> 09:15
assert.strictEqual(snapMinutesToGrid(555, 30), 570); // 09:15 -> 09:30

// 50% on 09:00~21:00 timeline = 15:00
assert.strictEqual(snapPercentToTime(50, config12h), '15:00');
console.log('✅ Test 3 passed: Grid snapping calculations');

// Test 4: computeResizedEndTime
// Original starts at 10:00, user drags right to 11:40 (approx 22.2%) -> snaps to 11:30 or 12:00
const resized = computeResizedEndTime('10:00', 30, config12h, 30);
// 30% of 12h = 3.6h -> 9:00 + 3.6h = 12:36 -> snap to 12:30
assert.strictEqual(resized, '12:30');
console.log('✅ Test 4 passed: Resizing end time calculation');

// Test 5: Resource occupancy summary
const events = [
  { startTime: '10:00', endTime: '12:00' }, // 120 mins
  { startTime: '14:00', endTime: '16:00' }, // 120 mins
];
// Total 240 mins out of 720 mins (12h) = 33%
const summary = calculateResourceOccupancy('staff-1', events, config12h);
assert.strictEqual(summary.totalOperatingMinutes, 720);
assert.strictEqual(summary.bookedMinutes, 240);
assert.strictEqual(summary.occupancyRatePercent, 33);
assert.strictEqual(summary.availableMinutes, 480);
assert.strictEqual(summary.bookingCount, 2);
console.log('✅ Test 5 passed: Resource occupancy rate calculation');

console.log('🎉 All timelineGridEngine tests passed!');
