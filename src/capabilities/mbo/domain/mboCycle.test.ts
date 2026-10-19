import assert from 'node:assert/strict';
import {
  DEFAULT_MBO_CYCLE,
  areGoalsLocked,
  calendarDate,
  isReviewWindowOpen,
  normalizeCycleSettings,
} from './mboCycle';

assert.equal(areGoalsLocked(DEFAULT_MBO_CYCLE, new Date(2026, 0, 31)), false);
assert.equal(areGoalsLocked(DEFAULT_MBO_CYCLE, new Date(2026, 1, 1)), true);
assert.equal(areGoalsLocked({ ...DEFAULT_MBO_CYCLE, goalLockEnabled: false }, new Date(2026, 5, 1)), false);

assert.equal(isReviewWindowOpen(DEFAULT_MBO_CYCLE, new Date(2026, 10, 30)), false);
assert.equal(isReviewWindowOpen(DEFAULT_MBO_CYCLE, new Date(2026, 11, 1)), true);
assert.equal(isReviewWindowOpen(DEFAULT_MBO_CYCLE, new Date(2026, 11, 31)), true);
assert.equal(isReviewWindowOpen(DEFAULT_MBO_CYCLE, new Date(2027, 0, 1)), false);

const feb = calendarDate(2026, 2, 31);
assert.equal(feb.getMonth(), 1);
assert.equal(feb.getDate(), 28);

const normalized = normalizeCycleSettings(null);
assert.equal(normalized.goalLockMonth, 1);
assert.equal(normalized.reviewStartMonth, 12);

console.log('mboCycle.test.ts: ok');
