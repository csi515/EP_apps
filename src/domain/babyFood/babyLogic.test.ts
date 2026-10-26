/**
 * Baby Logic Facade — 윤달·월 경계·1/N 정산
 * 실행: npx tsx src/domain/babyFood/babyLogic.test.ts
 */
import assert from 'node:assert/strict';
import {
  calculateBabyAge,
  calculateSettlement,
  getWeaningStageGuide,
} from './babyLogic';

function testLeapYearAndMonthEnds(): void {
  // 윤달: 2024-01-31 → 2024-02-29 = 1개월 0일
  assert.deepEqual(calculateBabyAge('2024-01-31', '2024-02-29'), {
    months: 1,
    days: 0,
  });

  // 윤달 전날: 2024-01-31 → 2024-02-28 = 아직 만 1개월 미도달
  assert.deepEqual(calculateBabyAge('2024-01-31', '2024-02-28'), {
    months: 0,
    days: 28,
  });

  // 평년 2월 말: 2026-01-31 → 2026-02-28 = 1개월 0일
  assert.deepEqual(calculateBabyAge('2026-01-31', '2026-02-28'), {
    months: 1,
    days: 0,
  });

  // 정확히 만 7개월 당일
  assert.deepEqual(calculateBabyAge('2026-03-15', '2026-10-15'), {
    months: 7,
    days: 0,
  });

  // 만 7개월 + 10일
  assert.deepEqual(calculateBabyAge('2026-03-15', '2026-10-25'), {
    months: 7,
    days: 10,
  });

  // 만 7개월 하루 전
  assert.deepEqual(calculateBabyAge('2026-03-16', '2026-10-15'), {
    months: 6,
    days: 29,
  });

  console.log('✔ leap year / month-boundary age parts passed.');
}

function testWeaningStages(): void {
  assert.equal(getWeaningStageGuide(4).stageKey, 'early');
  assert.equal(getWeaningStageGuide(7).stageKey, 'middle');
  assert.equal(getWeaningStageGuide(9).stageKey, 'late');
  assert.equal(getWeaningStageGuide(12).stageKey, 'complete');
  console.log('✔ weaning stage boundaries passed.');
}

function testSettlementEdges(): void {
  const res1 = calculateSettlement(10000, 3);
  assert.equal(res1.perPersonAmount, 3333);
  assert.equal(res1.remainderAmount, 1);

  const res0 = calculateSettlement(50000, 0);
  assert.equal(res0.perPersonAmount, 0);
  assert.equal(res0.remainderAmount, 50000);

  const exact = calculateSettlement(30000, 3);
  assert.equal(exact.perPersonAmount, 10000);
  assert.equal(exact.remainderAmount, 0);

  console.log('✔ settlement 1/N edges passed.');
}

console.log('=== [babyLogic] Test Suite Start ===');
testLeapYearAndMonthEnds();
testWeaningStages();
testSettlementEdges();
console.log('=== [babyLogic] All Tests Passed Successfully! ===');
