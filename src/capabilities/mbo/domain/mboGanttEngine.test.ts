import assert from 'node:assert/strict';
import {
  barPercentsToDateRange,
  projectBarInYear,
  resizeBarPercents,
  shiftBarPercents,
  todayPercentInYear,
} from './mboGanttEngine';
import { barPercentsToTimelineRange, projectBarOnScale } from './mboGanttScaleEngine';

const bar = projectBarInYear('2026-03-01', '2026-06-30', 2026);
assert.ok(bar);
assert.ok(bar!.leftPercent > 0);
assert.ok(bar!.widthPercent > 5);

const shifted = shiftBarPercents(bar!, 5);
assert.equal(shifted.widthPercent, bar!.widthPercent);
assert.ok(shifted.leftPercent > bar!.leftPercent);

const resized = resizeBarPercents(bar!, 'end', 3);
assert.ok(resized.widthPercent > bar!.widthPercent);

const dates = barPercentsToDateRange(10, 20, 2026);
assert.match(dates.startDate, /^2026-/);
assert.match(dates.targetDate, /^2026-/);

const y = new Date().getFullYear();
assert.ok(todayPercentInYear(y) != null);

const twoYear = projectBarOnScale('2026-11-01', '2027-02-28', 2026, 'month', 2);
assert.ok(twoYear);
const cross = barPercentsToTimelineRange(twoYear!.leftPercent, twoYear!.widthPercent, 2026, 'month', 2);
assert.ok(cross.startDate.startsWith('2026'));
assert.ok(cross.targetDate.startsWith('2027'));

console.log('mboGanttEngine.test.ts OK');
