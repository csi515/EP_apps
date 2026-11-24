/**
 * 실행: npx tsx src/capabilities/mbo/domain/mboFrappeGanttViewModes.test.ts
 */
import assert from 'node:assert/strict';
import {
  mboFrappeViewModeForVisibleRange,
  mboFrappeViewModesForVisibleRange,
  mboGanttFittedColumnWidth,
  visibleRangeColumnCount,
  visibleRangeDaySpan,
} from './mboFrappeGanttViewModes';

assert.equal(visibleRangeDaySpan({ startDate: '2026-11-01', endDate: '2026-11-30' }), 30);
assert.equal(visibleRangeDaySpan({ startDate: '2026-01-01', endDate: '2026-12-31' }), 365);

assert.equal(
  mboFrappeViewModeForVisibleRange({ startDate: '2026-11-01', endDate: '2026-11-30' }),
  'Week',
);
assert.equal(
  mboFrappeViewModeForVisibleRange({ startDate: '2026-01-01', endDate: '2026-06-30' }),
  'Month',
);
assert.equal(
  mboFrappeViewModeForVisibleRange({ startDate: '2025-01-01', endDate: '2027-12-31' }),
  'Year',
);

assert.equal(
  visibleRangeColumnCount({ startDate: '2026-01-01', endDate: '2026-12-31' }, 'Month'),
  12,
);
assert.equal(
  visibleRangeColumnCount({ startDate: '2026-11-01', endDate: '2026-11-30' }, 'Week'),
  5,
);
assert.equal(
  visibleRangeColumnCount({ startDate: '2026-01-01', endDate: '2026-12-31' }, 'Year'),
  1,
);

{
  // 일수상 Week이나 가용 폭이 좁으면 Month로 승격
  const shortRange = { startDate: '2026-03-01', endDate: '2026-04-30' };
  assert.equal(mboFrappeViewModeForVisibleRange(shortRange), 'Week');
  assert.equal(mboFrappeViewModeForVisibleRange(shortRange, 200), 'Month');

  const yearRange = { startDate: '2026-01-01', endDate: '2026-12-31' };
  const w = mboGanttFittedColumnWidth(yearRange, 'Month', 600);
  assert.equal(w, 49); // floor((600-1)/12)
  const modes = mboFrappeViewModesForVisibleRange(yearRange, 600, 'Month');
  assert.equal(modes[0]?.name, 'Month');
  assert.equal(modes[0]?.column_width, 49);
  assert.equal(modes[0]?.padding, '0d');
}

console.log('mboFrappeGanttViewModes.test.ts: ok');
