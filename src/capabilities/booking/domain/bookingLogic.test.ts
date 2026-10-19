import assert from 'node:assert/strict';
import { shouldDeductPassOnCancel } from './bookingLogic';

const startsAt = new Date('2026-10-19T19:00:00+09:00');

assert.equal(
  shouldDeductPassOnCancel({
    startsAt,
    now: new Date('2026-10-19T16:00:00+09:00'),
    cancellationDeadlineMinutes: 120,
  }),
  false
);

assert.equal(
  shouldDeductPassOnCancel({
    startsAt,
    now: new Date('2026-10-19T17:30:00+09:00'),
    cancellationDeadlineMinutes: 120,
  }),
  true
);

console.log('bookingLogic.test.ts: ok');
