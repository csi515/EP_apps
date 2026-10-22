import assert from 'node:assert/strict';
import {
  activeMealSlots,
  aggregateDaySlots,
  canManageMealSurveyActivity,
  cycleMealCellStatus,
  dayRange,
  monthRange,
  validateMealSurveySettings,
  weekRange,
} from './mealSurveyEngine';

assert.equal(canManageMealSurveyActivity({ role: 'owner' }), true);
assert.equal(canManageMealSurveyActivity({ role: 'staff', permissions: {} }), false);
assert.equal(
  canManageMealSurveyActivity({ role: 'staff', permissions: { 'meal_survey:manage': true } }),
  true
);

assert.equal(
  validateMealSurveySettings({
    offerBreakfast: false,
    offerLunch: false,
    offerDinner: false,
    defaultEating: true,
    breakfastCutoffTime: '17:00',
    breakfastCutoffPrevDay: true,
    lunchCutoffTime: '09:00',
    lunchCutoffPrevDay: false,
    dinnerCutoffTime: '15:00',
    dinnerCutoffPrevDay: false,
  }).isValid,
  false
);
assert.equal(
  validateMealSurveySettings({
    offerBreakfast: false,
    offerLunch: true,
    offerDinner: false,
    defaultEating: true,
    breakfastCutoffTime: '17:00',
    breakfastCutoffPrevDay: true,
    lunchCutoffTime: '09:00',
    lunchCutoffPrevDay: false,
    dinnerCutoffTime: '15:00',
    dinnerCutoffPrevDay: false,
  }).isValid,
  true
);

assert.deepEqual(
  activeMealSlots({
    offerBreakfast: true,
    offerLunch: false,
    offerDinner: true,
    defaultEating: true,
    breakfastCutoffTime: '17:00',
    breakfastCutoffPrevDay: true,
    lunchCutoffTime: '09:00',
    lunchCutoffPrevDay: false,
    dinnerCutoffTime: '15:00',
    dinnerCutoffPrevDay: false,
  }),
  ['breakfast', 'dinner']
);

assert.equal(cycleMealCellStatus(null), 'eating');
assert.equal(cycleMealCellStatus('eating'), 'skipping');
assert.equal(cycleMealCellStatus('skipping'), null);

const anchor = new Date(2026, 9, 15); // 2026-10-15
assert.deepEqual(monthRange(anchor), { from: '2026-10-01', to: '2026-10-31' });
assert.deepEqual(weekRange(anchor), { from: '2026-10-12', to: '2026-10-18' });
assert.deepEqual(dayRange(anchor), { from: '2026-10-15', to: '2026-10-15' });

const agg = aggregateDaySlots(
  3,
  [
    { mealDate: '2026-10-15', mealSlot: 'lunch', status: 'eating' },
    { mealDate: '2026-10-15', mealSlot: 'lunch', status: 'skipping' },
  ],
  ['lunch'],
  ['2026-10-15']
);
assert.equal(agg[0].eatingCount, 1);
assert.equal(agg[0].skippingCount, 1);
assert.equal(agg[0].unsetCount, 1);

console.log('mealSurveyEngine.test.ts: ok');
