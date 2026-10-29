import assert from 'node:assert/strict';
import {
  formatPeriodYm,
  hasMonthlyCheckin,
  isValidPeriodYm,
  listMissingMonthlyCheckins,
} from './mboMonthlyCheckin';

assert.equal(isValidPeriodYm('2026-03'), true);
assert.equal(isValidPeriodYm('2026-13'), false);
assert.equal(isValidPeriodYm('26-03'), false);

const ym = formatPeriodYm(new Date('2026-04-15T00:00:00Z'));
assert.equal(ym, '2026-04');

const logs = [
  { projectId: 'p1', periodYm: '2026-03' },
  { projectId: 'p2', periodYm: '2026-04' },
];
assert.equal(hasMonthlyCheckin(logs, 'p1', '2026-03'), true);
assert.equal(hasMonthlyCheckin(logs, 'p1', '2026-04'), false);

assert.deepEqual(listMissingMonthlyCheckins(['p1', 'p2', 'p3'], logs, '2026-04'), [
  'p1',
  'p3',
]);

console.log('mboMonthlyCheckin.test.ts: ok');
