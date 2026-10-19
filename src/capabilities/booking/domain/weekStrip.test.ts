import assert from 'node:assert/strict';
import { formatSlotBadge, weekDates } from './weekStrip';

assert.deepEqual(formatSlotBadge('19:00', 4, 6), { label: '19:00 (4/6명 잔여)', closed: false });
assert.deepEqual(formatSlotBadge('20:00', 0, 6), { label: '20:00 (마감)', closed: true });
assert.equal(weekDates(new Date('2026-10-21T12:00:00')).length, 7);

console.log('weekStrip.test.ts: ok');
