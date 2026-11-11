import assert from 'node:assert/strict';
import {
  DEFAULT_MEAL_SURVEY_SETTINGS,
  activeMealSlots,
  aggregateDaySlots,
  applyDefaultEatingToDayCounts,
  buildMealMonthGrid,
  canManageMealSurveyActivity,
  cycleMealCellStatus,
  dayRange,
  isCafeteriaClosedOn,
  isMealSlotWritable,
  isDayChecked,
  listOperatingDatesInMonth,
  listOperatingDatesInRange,
  listWritableSlotsForDay,
  mealStatusLabel,
  monthRange,
  resolveMealCellForKitchen,
  toggleCafeteriaClosedDate,
  toggleClosedWeekday,
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
    ...DEFAULT_MEAL_SURVEY_SETTINGS,
    offerBreakfast: false,
    offerLunch: false,
    offerDinner: false,
  }).isValid,
  false
);
assert.equal(validateMealSurveySettings({ ...DEFAULT_MEAL_SURVEY_SETTINGS }).isValid, true);
assert.equal(
  validateMealSurveySettings({
    ...DEFAULT_MEAL_SURVEY_SETTINGS,
    closedWeekdays: [0, 1, 2, 3, 4, 5, 6],
  }).isValid,
  false
);

assert.deepEqual(
  activeMealSlots({
    ...DEFAULT_MEAL_SURVEY_SETTINGS,
    offerBreakfast: true,
    offerLunch: false,
    offerDinner: true,
  }),
  ['breakfast', 'dinner']
);

assert.equal(cycleMealCellStatus(null), 'eating');
assert.equal(cycleMealCellStatus('eating'), 'skipping');
assert.equal(cycleMealCellStatus('skipping'), null);

const anchor = new Date(2026, 9, 15); // 2026-10-15 Thursday
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

const aggDefaultEating = aggregateDaySlots(
  3,
  [
    { mealDate: '2026-10-15', mealSlot: 'lunch', status: 'eating' },
    { mealDate: '2026-10-15', mealSlot: 'lunch', status: 'skipping' },
  ],
  ['lunch'],
  ['2026-10-15'],
  { defaultEating: true }
);
assert.equal(aggDefaultEating[0].eatingCount, 2, 'unset counted as eating');
assert.equal(aggDefaultEating[0].skippingCount, 1);
assert.equal(aggDefaultEating[0].unsetCount, 0);

assert.deepEqual(
  applyDefaultEatingToDayCounts({ eating: 1, skipping: 1, unset: 1 }, true),
  { eating: 2, skipping: 1, unset: 0 }
);
assert.equal(resolveMealCellForKitchen(null, true), 'eating');
assert.equal(resolveMealCellForKitchen(null, false), null);
assert.equal(mealStatusLabel(null, { defaultEating: true }), '식사(기본)');
assert.equal(mealStatusLabel(null), '미응답');

// 기본 토·일 휴무
assert.equal(isCafeteriaClosedOn(DEFAULT_MEAL_SURVEY_SETTINGS, '2026-10-17'), true); // Sat
assert.equal(isCafeteriaClosedOn(DEFAULT_MEAL_SURVEY_SETTINGS, '2026-10-18'), true); // Sun
assert.equal(isCafeteriaClosedOn(DEFAULT_MEAL_SURVEY_SETTINGS, '2026-10-15'), false); // Thu

// 예외 개장: 토요일 열기
const openSat = toggleCafeteriaClosedDate(DEFAULT_MEAL_SURVEY_SETTINGS, '2026-10-17');
assert.deepEqual(openSat.openDates, ['2026-10-17']);
assert.equal(isCafeteriaClosedOn(openSat, '2026-10-17'), false);

// 평일 휴무 지정
const closeThu = toggleCafeteriaClosedDate(DEFAULT_MEAL_SURVEY_SETTINGS, '2026-10-15');
assert.deepEqual(closeThu.closedDates, ['2026-10-15']);
assert.equal(isCafeteriaClosedOn(closeThu, '2026-10-15'), true);

const noSat = toggleClosedWeekday(DEFAULT_MEAL_SURVEY_SETTINGS, 6);
assert.equal(noSat.closedWeekdays.includes(6), false);
assert.equal(isCafeteriaClosedOn(noSat, '2026-10-17'), false);

const openAllWeek = toggleClosedWeekday(noSat, 0);
assert.deepEqual(openAllWeek.closedWeekdays, []);
assert.equal(isCafeteriaClosedOn(openAllWeek, '2026-10-17'), false);
assert.equal(isCafeteriaClosedOn(openAllWeek, '2026-10-18'), false);

const operating = listOperatingDatesInRange(
  DEFAULT_MEAL_SURVEY_SETTINGS,
  '2026-10-12',
  '2026-10-18'
);
assert.deepEqual(operating, [
  '2026-10-12',
  '2026-10-13',
  '2026-10-14',
  '2026-10-15',
  '2026-10-16',
]);

const octOperating = listOperatingDatesInMonth(DEFAULT_MEAL_SURVEY_SETTINGS, 2026, 9);
assert.equal(octOperating.includes('2026-10-15'), true);
assert.equal(octOperating.includes('2026-10-17'), false);
assert.equal(octOperating.includes('2026-10-18'), false);
assert.equal(octOperating[0], '2026-10-01');
assert.equal(octOperating.at(-1), '2026-10-30');

const beforeCutoff = new Date(2026, 9, 14, 8, 0, 0);
assert.deepEqual(
  listWritableSlotsForDay(DEFAULT_MEAL_SURVEY_SETTINGS, '2026-10-15', ['lunch'], beforeCutoff),
  ['lunch']
);
assert.deepEqual(
  listWritableSlotsForDay(DEFAULT_MEAL_SURVEY_SETTINGS, '2026-10-17', ['lunch'], beforeCutoff),
  [],
  'closed day has no writable slots'
);

assert.equal(isDayChecked({}, '2026-10-15', ['lunch']), true, 'unset counts as checked');
assert.equal(
  isDayChecked({ '2026-10-15|lunch': 'skipping' }, '2026-10-15', ['lunch']),
  false
);
assert.equal(
  isDayChecked({ '2026-10-15|lunch': 'eating' }, '2026-10-15', ['lunch']),
  true
);
assert.equal(
  isDayChecked(
    { '2026-10-15|lunch': 'skipping', '2026-10-15|dinner': 'eating' },
    '2026-10-15',
    ['lunch', 'dinner']
  ),
  true,
  'mixed → checked'
);
assert.equal(isDayChecked({}, '2026-10-15', []), false);

assert.equal(
  isMealSlotWritable(DEFAULT_MEAL_SURVEY_SETTINGS, '2026-10-17', 'lunch', new Date('2026-10-16T08:00:00')),
  false,
  'weekend closed blocks write'
);

const grid = buildMealMonthGrid(DEFAULT_MEAL_SURVEY_SETTINGS, 2026, 9);
assert.ok(grid.length % 7 === 0);
const satCell = grid.find((d) => d.date === '2026-10-17');
assert.ok(satCell);
assert.equal(satCell!.isClosed, true);

console.log('mealSurveyEngine.test.ts: ok');
