import assert from 'node:assert/strict';
import {
  projectBarOnScale,
  scaleBuckets,
  timelineBounds,
  todayPercentOnScale,
} from './mboGanttScaleEngine';

const monthBuckets = scaleBuckets(2026, 'month', 1);
assert.equal(monthBuckets.length, 12);
assert.equal(monthBuckets[0]!.key, '2026-M1');
assert.equal(monthBuckets[11]!.key, '2026-M12');

const quarterBuckets = scaleBuckets(2026, 'quarter', 1);
assert.equal(quarterBuckets.length, 4);

const yearSpan = scaleBuckets(2026, 'year', 2);
assert.equal(yearSpan.length, 2);
assert.equal(yearSpan[1]!.label, '2027년');

const bounds = timelineBounds(2026, 'month', 1);
assert.ok(bounds.spanMs > 0);

const bar = projectBarOnScale('2026-02-01', '2026-03-15', 2026, 'month', 1);
assert.ok(bar);
assert.ok(bar!.leftPercent >= 0);
assert.ok(bar!.widthPercent > 0);

const outside = projectBarOnScale('2025-01-01', '2025-02-01', 2026, 'month', 1);
assert.equal(outside, null);

const today = todayPercentOnScale(2026, 'year', new Date('2026-06-15T12:00:00'), 1);
assert.ok(today != null && today > 0 && today < 100);

console.log('mboGanttScaleEngine.test.ts: ok');
