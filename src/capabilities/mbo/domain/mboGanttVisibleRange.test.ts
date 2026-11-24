/**
 * 실행: npx tsx src/capabilities/mbo/domain/mboGanttVisibleRange.test.ts
 */
import assert from 'node:assert/strict';
import {
  clipDateRangeToVisible,
  currentMonthVisibleRange,
  currentYearVisibleRange,
  datesOverlapRange,
  isTodayInVisibleRange,
  monthVisibleRange,
  normalizeVisibleRange,
} from './mboGanttVisibleRange';

{
  const r = monthVisibleRange(2026, 11);
  assert.equal(r.startDate, '2026-11-01');
  assert.equal(r.endDate, '2026-11-30');
}

{
  const now = new Date(2026, 1, 15); // Feb 2026
  const r = currentMonthVisibleRange(now);
  assert.equal(r.startDate, '2026-02-01');
  assert.equal(r.endDate, '2026-02-28');
  const y = currentYearVisibleRange(now);
  assert.equal(y.startDate, '2026-01-01');
  assert.equal(y.endDate, '2026-12-31');
}

{
  assert.equal(datesOverlapRange('2026-11-01', '2026-11-15', '2026-11-01', '2026-11-30'), true);
  assert.equal(datesOverlapRange('2026-10-01', '2026-10-31', '2026-11-01', '2026-11-30'), false);
  assert.equal(datesOverlapRange('2026-10-15', '2026-11-05', '2026-11-01', '2026-11-30'), true);
  assert.equal(datesOverlapRange('', '', '2026-11-01', '2026-11-30'), true);
}

{
  const n = normalizeVisibleRange({ startDate: '2026-11-30', endDate: '2026-11-01' });
  assert.deepEqual(n, { startDate: '2026-11-01', endDate: '2026-11-30' });
}

{
  assert.equal(
    isTodayInVisibleRange({ startDate: '2026-11-01', endDate: '2026-11-30' }, new Date(2026, 10, 15)),
    true,
  );
  assert.equal(
    isTodayInVisibleRange({ startDate: '2026-11-01', endDate: '2026-11-30' }, new Date(2026, 9, 15)),
    false,
  );
}

{
  const range = { startDate: '2026-11-01', endDate: '2026-11-30' };
  assert.equal(clipDateRangeToVisible('2026-10-01', '2026-10-31', range), null);
  assert.deepEqual(clipDateRangeToVisible('2026-10-15', '2026-11-10', range), {
    start: '2026-11-01',
    end: '2026-11-10',
  });
  assert.deepEqual(clipDateRangeToVisible('2026-11-05', '2026-12-15', range), {
    start: '2026-11-05',
    end: '2026-11-30',
  });
  assert.deepEqual(clipDateRangeToVisible('2026-11-05', '2026-11-20', range), {
    start: '2026-11-05',
    end: '2026-11-20',
  });
  assert.deepEqual(clipDateRangeToVisible('2026-11-20', '2026-11-05', range), {
    start: '2026-11-05',
    end: '2026-11-20',
  });
}

console.log('mboGanttVisibleRange.test.ts: ok');
