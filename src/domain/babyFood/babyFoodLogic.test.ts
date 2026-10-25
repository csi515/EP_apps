/**
 * Baby Food Logic Engine — 단위 및 경계값 불변식 테스트
 * 실행: npx tsx src/domain/babyFood/babyFoodLogic.test.ts
 */
import assert from 'node:assert/strict';
import {
  calculateBabyAge,
  getWeaningStageGuide,
  getBabyAgeInfo,
  calculateSettlement,
} from './babyFoodLogic';

function testCalculateBabyAge(): void {
  // 1. 같은 날짜 (당일 출생)
  assert.equal(
    calculateBabyAge('2026-10-25', '2026-10-25'),
    0,
    '당일 출생은 0개월'
  );

  // 2. 정확히 만 7개월
  assert.equal(
    calculateBabyAge('2026-03-15', '2026-10-15'),
    7,
    '3월 15일생 10월 15일 기준 만 7개월'
  );

  // 3. 만 7개월 되기 하루 전 (만 6개월)
  assert.equal(
    calculateBabyAge('2026-03-16', '2026-10-15'),
    6,
    '3월 16일생 10월 15일 기준 만 6개월'
  );

  // 4. 만 7개월 지난 다음 날 (만 7개월)
  assert.equal(
    calculateBabyAge('2026-03-14', '2026-10-15'),
    7,
    '3월 14일생 10월 15일 기준 만 7개월'
  );

  // 5. 월말 경계값 (1월 31일생 -> 2월 28일 말일 도달)
  assert.equal(
    calculateBabyAge('2026-01-31', '2026-02-28'),
    1,
    '1월 31일생 2월 28일(말일) 도달 시 만 1개월 인정'
  );

  // 6. 월말 경계값 (1월 31일생 -> 2월 27일 기준)
  assert.equal(
    calculateBabyAge('2026-01-31', '2026-02-27'),
    0,
    '1월 31일생 2월 27일(말일 전) 기준 0개월'
  );

  // 7. 연도를 넘긴 경우 (2025-10-10 -> 2026-10-25)
  assert.equal(
    calculateBabyAge('2025-10-10', '2026-10-25'),
    12,
    '1년 경과 시 만 12개월'
  );

  // 8. 4~6개월 초기 경계값
  assert.equal(calculateBabyAge('2026-06-10', '2026-10-10'), 4, '만 4개월');
  assert.equal(calculateBabyAge('2026-04-10', '2026-10-10'), 6, '만 6개월');

  // 9. 미래 날짜 입력 시 방어
  assert.equal(
    calculateBabyAge('2026-11-01', '2026-10-25'),
    0,
    '미래 출생일은 0개월 반환'
  );

  // 10. 유효하지 않은 문자열 방어
  assert.equal(calculateBabyAge('invalid-date'), 0, '잘못된 날짜는 0 반환');

  console.log('✔ calculateBabyAge tests passed.');
}

function testGetWeaningStageGuide(): void {
  // 1. 준비기 (0~3개월)
  const prep0 = getWeaningStageGuide(0);
  assert.equal(prep0.stageKey, 'prep');
  assert.equal(prep0.stageName, '준비기');
  assert.ok(prep0.recommendedFoods.includes('모유'));
  assert.ok(prep0.cautionFoods.some((food) => food.includes('꿀')));

  const prep3 = getWeaningStageGuide(3);
  assert.equal(prep3.stageKey, 'prep');

  // 2. 초기 (4~6개월)
  const early4 = getWeaningStageGuide(4);
  assert.equal(early4.stageKey, 'early');
  assert.equal(early4.stageName, '초기');
  assert.ok(early4.recommendedFoods.includes('쌀미음'));
  assert.ok(early4.recommendedFoods.includes('애호박'));
  assert.ok(early4.cautionFoods.some((food) => food.includes('꿀')));

  const early6 = getWeaningStageGuide(6);
  assert.equal(early6.stageKey, 'early');

  // 3. 중기 (7~8개월)
  const mid7 = getWeaningStageGuide(7);
  assert.equal(mid7.stageKey, 'middle');
  assert.equal(mid7.stageName, '중기');
  assert.ok(mid7.recommendedFoods.some((f) => f.includes('쇠고기')));
  assert.ok(mid7.cautionFoods.includes('생우유'));

  const mid8 = getWeaningStageGuide(8);
  assert.equal(mid8.stageKey, 'middle');

  // 4. 후기 (9~11개월)
  const late9 = getWeaningStageGuide(9);
  assert.equal(late9.stageKey, 'late');
  assert.equal(late9.stageName, '후기');
  assert.ok(late9.recommendedFoods.some((f) => f.includes('흰살생선')));

  const late11 = getWeaningStageGuide(11);
  assert.equal(late11.stageKey, 'late');

  // 5. 완료기 (12개월+)
  const complete12 = getWeaningStageGuide(12);
  assert.equal(complete12.stageKey, 'complete');
  assert.equal(complete12.stageName, '완료기');
  assert.ok(complete12.recommendedFoods.some((f) => f.includes('진밥')));

  const complete24 = getWeaningStageGuide(24);
  assert.equal(complete24.stageKey, 'complete');

  // 6. getBabyAgeInfo 헬퍼 검증
  const info = getBabyAgeInfo('2026-03-15', '2026-10-15');
  assert.equal(info.months, 7);
  assert.equal(info.formattedAge, '만 7개월');
  assert.equal(info.stage.stageKey, 'middle');

  console.log('✔ getWeaningStageGuide tests passed.');
}

function testCalculateSettlement(): void {
  // 1. 나누어떨어지지 않는 경우 (10,000원, 3명 -> 3,333원씩, 잔여금 1원)
  const res1 = calculateSettlement(10000, 3);
  assert.equal(res1.perPersonAmount, 3333);
  assert.equal(res1.remainderAmount, 1);
  assert.equal(res1.perPersonAmount * 3 + res1.remainderAmount, 10000);
  assert.equal(res1.formattedPerPerson, '3,333원');
  assert.equal(res1.formattedRemainder, '1원');

  // 2. 정확히 나누어떨어지는 경우 (30,000원, 3명 -> 10,000원씩, 잔여금 0원)
  const res2 = calculateSettlement(30000, 3);
  assert.equal(res2.perPersonAmount, 10000);
  assert.equal(res2.remainderAmount, 0);
  assert.equal(res2.formattedPerPerson, '10,000원');
  assert.equal(res2.formattedRemainder, '0원');

  // 3. 4명 분할 (10,000원, 4명 -> 2,500원씩, 잔여금 0원)
  const res3 = calculateSettlement(10000, 4);
  assert.equal(res3.perPersonAmount, 2500);
  assert.equal(res3.remainderAmount, 0);

  // 4. 참여 아기 수가 0명인 경우
  const res4 = calculateSettlement(50000, 0);
  assert.equal(res4.perPersonAmount, 0);
  assert.equal(res4.remainderAmount, 50000);

  // 5. 총 금액이 0원인 경우
  const res5 = calculateSettlement(0, 5);
  assert.equal(res5.perPersonAmount, 0);
  assert.equal(res5.remainderAmount, 0);

  // 6. 음수 및 비정상 입력 방어
  const res6 = calculateSettlement(-5000, -2);
  assert.equal(res6.perPersonAmount, 0);
  assert.equal(res6.remainderAmount, 0);

  // 7. 7명 55,500원 정산 불변식 검증
  const total = 55500;
  const count = 7;
  const res7 = calculateSettlement(total, count);
  assert.equal(res7.perPersonAmount * count + res7.remainderAmount, total);

  console.log('✔ calculateSettlement tests passed.');
}

function runAllTests(): void {
  console.log('=== [BabyFoodLogic] Test Suite Start ===');
  testCalculateBabyAge();
  testGetWeaningStageGuide();
  testCalculateSettlement();
  console.log('=== [BabyFoodLogic] All Tests Passed Successfully! ===');
}

runAllTests();
