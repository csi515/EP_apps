import assert from 'node:assert/strict';
import {
  formatPeriodYm,
  hasMonthlyCheckin,
  isValidPeriodYm,
  listMissingMonthlyCheckins,
  listPeriodYmBetween,
  parsePeriodYm,
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

assert.deepEqual(listPeriodYmBetween('2026-01-01', '2026-03-31'), [
  '2026-01',
  '2026-02',
  '2026-03',
]);
assert.deepEqual(listPeriodYmBetween('2026-01-15', '2026-01-20'), ['2026-01']);
assert.deepEqual(listPeriodYmBetween('2025-11-01', '2026-02-15'), [
  '2025-11',
  '2025-12',
  '2026-01',
  '2026-02',
]);
assert.deepEqual(listPeriodYmBetween('2026-03-01', '2026-01-01'), [
  '2026-01',
  '2026-02',
  '2026-03',
]);
assert.deepEqual(listPeriodYmBetween('bad', '2026-01-01'), []);
assert.deepEqual(parsePeriodYm('2026-07'), { year: 2026, month: 7 });
assert.equal(parsePeriodYm('2026-13'), null);

console.log('mboMonthlyCheckin.test.ts: ok');
