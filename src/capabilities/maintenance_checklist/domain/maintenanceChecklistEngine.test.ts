import assert from 'node:assert/strict';
import {
  calculateChecklistProgress,
  evaluateChecklistUrgency,
  evaluateToleranceResult,
  generateCapaTicketFromInspectionFail,
  type ChecklistItem,
} from './maintenanceChecklistEngine';

function run() {
  const items: ChecklistItem[] = [
    {
      id: 'chk-1',
      title: '온탕 수온 점검 (38~42도)',
      isRequired: true,
      isCompleted: true,
      numericValue: 40.5,
      minThreshold: 38.0,
      maxThreshold: 42.0,
    },
    {
      id: 'chk-2',
      title: '남성/여성 탈의실 바닥 소독',
      isRequired: true,
      isCompleted: false,
    },
    {
      id: 'chk-3',
      title: '음료 자판기 잔돈 보충',
      isRequired: false,
      isCompleted: false,
    },
    {
      id: 'chk-4',
      title: '출입문 키오스크 영수증 용지 점검',
      isRequired: false,
      isCompleted: true,
    },
  ];

  // 1. 진행률 계산 (총 4개 중 2개 완료 = 50%, 필수 2개 중 1개 완료 = 미충족)
  const progress = calculateChecklistProgress(items);
  assert.equal(progress.totalCount, 4);
  assert.equal(progress.completedCount, 2);
  assert.equal(progress.requiredCount, 2);
  assert.equal(progress.requiredCompletedCount, 1);
  assert.equal(progress.ratePercent, 50);
  assert.equal(progress.isRequiredFulfilled, false);

  // 2. 마감 전 긴급도 평가 (아직 마감 전이지만 필수 누락 존재 -> WARNING)
  const beforeDeadline = evaluateChecklistUrgency({
    items,
    deadlineTime: '12:00',
    currentTime: '10:00',
  });
  assert.equal(beforeDeadline.hasMissingRequired, true);
  assert.deepEqual(beforeDeadline.missingRequiredItemIds, ['chk-2']);
  assert.equal(beforeDeadline.isDeadlinePassed, false);
  assert.equal(beforeDeadline.hasOutOfRangeValues, false);
  assert.equal(beforeDeadline.alertLevel, 'WARNING');

  // 3. 마감 초과 시 평가 (마감 지났는데 필수 누락 -> CRITICAL)
  const afterDeadline = evaluateChecklistUrgency({
    items,
    deadlineTime: '12:00',
    currentTime: '12:30',
  });
  assert.equal(afterDeadline.isDeadlinePassed, true);
  assert.equal(afterDeadline.alertLevel, 'CRITICAL');

  // 4. 수온 이상치 (임계 범위 38~42 벗어남)
  const abnormalItems: ChecklistItem[] = [
    {
      ...items[0],
      numericValue: 45.0, // 초과!
    },
    {
      ...items[1],
      isCompleted: true,
    },
  ];
  const outOfRangeCheck = evaluateChecklistUrgency({
    items: abnormalItems,
    deadlineTime: '12:00',
    currentTime: '10:00',
  });
  assert.equal(outOfRangeCheck.hasOutOfRangeValues, true);
  assert.deepEqual(outOfRangeCheck.outOfRangeItemIds, ['chk-1']);
  assert.equal(outOfRangeCheck.alertLevel, 'CRITICAL');

  // 5. 정량 수치 허용 공차(Tolerance) 판정 검증
  // 냉장고 온도: -2℃ ~ 4℃ (정상치: 1.5℃)
  const passCheck = evaluateToleranceResult({
    itemId: 'chk-fridge',
    itemTitle: '냉장고 보관 온도',
    numericValue: 1.5,
    minAllowed: -2,
    maxAllowed: 4,
    unit: '℃',
  });
  assert.equal(passCheck.isPassed, true);
  assert.equal(passCheck.status, 'PASS');

  // 상한 초과: 6.8℃ -> FAIL_HIGH
  const failHighCheck = evaluateToleranceResult({
    itemId: 'chk-fridge',
    itemTitle: '냉장고 보관 온도',
    numericValue: 6.8,
    minAllowed: -2,
    maxAllowed: 4,
    unit: '℃',
  });
  assert.equal(failHighCheck.isPassed, false);
  assert.equal(failHighCheck.status, 'FAIL_HIGH');
  assert.equal(failHighCheck.deviation, 2.8);

  // 6. 점검 실패 시 CAPA 긴급 티켓 자동 생성 검증
  const capaTicket = generateCapaTicketFromInspectionFail(
    {
      itemId: 'chk-fridge',
      itemTitle: '냉장고 보관 온도',
      numericValue: 8.5, // 4도 초과 + 심각
      minAllowed: -2,
      maxAllowed: 4,
      unit: '℃',
    },
    '김철수 점검원'
  );
  assert.equal(capaTicket.status, 'OPEN');
  assert.equal(capaTicket.priority, 'CRITICAL');
  assert.match(capaTicket.ticketNumber, /CAPA-/);
  assert.match(capaTicket.failureReason, /초과/);
  assert.match(capaTicket.correctiveActionPlan || '', /긴급 점검/);

  console.log('maintenanceChecklistEngine.test.ts: ok (with Tolerance & CAPA Auto-Ticket)');
}

run();
