import assert from 'node:assert/strict';
import {
  transitionTaskPipelineStage,
  evaluateStageSla,
  calculateStaffWorkload,
  detectStageBottlenecks,
  type TaskOrder,
} from './taskPipelineEngine';

function run() {
  const order: TaskOrder = {
    id: 'ord-1',
    orderNumber: 'RO-2026-001',
    title: '빈티지 가죽 가방 지퍼 수선',
    customerId: 'cust-1',
    currentStage: 'RECEIVED',
    stageEnteredAt: '2026-06-01T09:00:00Z',
  };

  // 1. 정상 순차 전이 (RECEIVED -> IN_PROGRESS -> INSPECTION -> READY_FOR_PICKUP -> COMPLETED)
  const step1 = transitionTaskPipelineStage(order, 'IN_PROGRESS', '2026-06-01T10:00:00Z');
  assert.equal(step1.success, true);
  assert.equal(step1.updatedOrder.currentStage, 'IN_PROGRESS');

  const step2 = transitionTaskPipelineStage(step1.updatedOrder, 'INSPECTION', '2026-06-02T15:00:00Z');
  assert.equal(step2.success, true);
  assert.equal(step2.updatedOrder.currentStage, 'INSPECTION');

  const step3 = transitionTaskPipelineStage(step2.updatedOrder, 'READY_FOR_PICKUP', '2026-06-03T11:00:00Z');
  assert.equal(step3.success, true);
  assert.equal(step3.updatedOrder.currentStage, 'READY_FOR_PICKUP');

  const step4 = transitionTaskPipelineStage(step3.updatedOrder, 'COMPLETED', '2026-06-03T18:00:00Z');
  assert.equal(step4.success, true);
  assert.equal(step4.updatedOrder.currentStage, 'COMPLETED');

  // 2. 비정상 전이 방어 (COMPLETED 상태에서 RECEIVED로 바로 점프 불가)
  const invalidJump = transitionTaskPipelineStage(step4.updatedOrder, 'RECEIVED');
  assert.equal(invalidJump.success, false);

  // 3. 검수 불합격 시 재작업(IN_PROGRESS) 되돌림 허용
  const inspectionOrder: TaskOrder = {
    ...order,
    currentStage: 'INSPECTION',
  };
  const rework = transitionTaskPipelineStage(inspectionOrder, 'IN_PROGRESS', '2026-06-02T16:00:00Z');
  assert.equal(rework.success, true);
  assert.equal(rework.updatedOrder.currentStage, 'IN_PROGRESS');

  // 4. SLA 지연 감지 (기준 24시간, 10시간 경과 -> 정상)
  const onTimeSla = evaluateStageSla({
    stageEnteredAt: '2026-06-01T09:00:00Z',
    slaHours: 24,
    currentTime: '2026-06-01T19:00:00Z', // 10시간 경과
  });
  assert.equal(onTimeSla.isBreached, false);
  assert.equal(onTimeSla.elapsedHours, 10);
  assert.equal(onTimeSla.remainingHours, 14);

  // 5. SLA 지연 감지 (기준 24시간, 30시간 경과 -> 지연 Breached)
  const breachedSla = evaluateStageSla({
    stageEnteredAt: '2026-06-01T09:00:00Z',
    slaHours: 24,
    currentTime: '2026-06-02T15:00:00Z', // 30시간 경과
  });
  assert.equal(breachedSla.isBreached, true);
  assert.equal(breachedSla.elapsedHours, 30);
  assert.equal(breachedSla.remainingHours, -6);

  // 6. 부품 대기(PARTS_WAITING) 전이 및 작업 재개(IN_PROGRESS) 검증
  const partsWait = transitionTaskPipelineStage(step1.updatedOrder, 'PARTS_WAITING', '2026-06-01T12:00:00Z');
  assert.equal(partsWait.success, true);
  assert.equal(partsWait.updatedOrder.currentStage, 'PARTS_WAITING');

  const resume = transitionTaskPipelineStage(partsWait.updatedOrder, 'IN_PROGRESS', '2026-06-01T14:00:00Z');
  assert.equal(resume.success, true);
  assert.equal(resume.updatedOrder.currentStage, 'IN_PROGRESS');

  // 7. 팀원별 업무 부하(Workload Clumping) 산출 및 경고 판정 검증
  const sampleTasks: TaskOrder[] = [
    {
      id: 't-1',
      orderNumber: 'RO-1',
      title: '과업 1',
      currentStage: 'IN_PROGRESS',
      stageEnteredAt: '2026-06-01T09:00:00Z',
      assignedStaffId: 'staff-alpha',
      assignedStaffName: '알파 엔지니어',
      slaHours: 24,
    },
    {
      id: 't-2',
      orderNumber: 'RO-2',
      title: '과업 2',
      currentStage: 'PARTS_WAITING',
      stageEnteredAt: '2026-06-01T09:00:00Z',
      assignedStaffId: 'staff-alpha',
      assignedStaffName: '알파 엔지니어',
      slaHours: 24,
    },
    {
      id: 't-3',
      orderNumber: 'RO-3',
      title: '과업 3',
      currentStage: 'IN_PROGRESS',
      stageEnteredAt: '2026-06-01T09:00:00Z',
      assignedStaffId: 'staff-alpha',
      assignedStaffName: '알파 엔지니어',
      slaHours: 24,
    },
    {
      id: 't-4',
      orderNumber: 'RO-4',
      title: '과업 4',
      currentStage: 'INSPECTION',
      stageEnteredAt: '2026-06-01T09:00:00Z',
      assignedStaffId: 'staff-alpha',
      assignedStaffName: '알파 엔지니어',
      slaHours: 24,
    },
    {
      id: 't-5',
      orderNumber: 'RO-5',
      title: '과업 5',
      currentStage: 'IN_PROGRESS',
      stageEnteredAt: '2026-06-01T09:00:00Z',
      assignedStaffId: 'staff-alpha',
      assignedStaffName: '알파 엔지니어',
      slaHours: 24,
    },
    {
      id: 't-6',
      orderNumber: 'RO-6',
      title: '과업 6',
      currentStage: 'IN_PROGRESS',
      stageEnteredAt: '2026-06-01T09:00:00Z',
      assignedStaffId: 'staff-beta',
      assignedStaffName: '베타 엔지니어',
      slaHours: 24,
    },
  ];

  const workloads = calculateStaffWorkload(
    sampleTasks,
    4,
    5,
    '2026-06-01T12:00:00Z' // 시작 3시간 후 (SLA 정상 범위)
  );
  assert.equal(workloads.length, 2);

  const alphaWorkload = workloads.find((w) => w.staffId === 'staff-alpha')!;
  assert.equal(alphaWorkload.activeTaskCount, 5);
  assert.equal(alphaWorkload.alertLevel, 'CRITICAL', '5건 이상 할당 시 CRITICAL 판정');

  const betaWorkload = workloads.find((w) => w.staffId === 'staff-beta')!;
  assert.equal(betaWorkload.activeTaskCount, 1);
  assert.equal(betaWorkload.alertLevel, 'NORMAL', '1건 할당 시 NORMAL 판정');

  // 8. 공정 병목(Bottleneck) 감지 검증
  const bottlenecks = detectStageBottlenecks(sampleTasks, '2026-06-01T15:00:00Z');
  const inProgressBottleneck = bottlenecks.find((b) => b.stage === 'IN_PROGRESS')!;
  assert.equal(inProgressBottleneck.activeTaskCount, 4);
  assert.equal(inProgressBottleneck.isBottleneck, true, '가장 태스크가 몰린 IN_PROGRESS 단계가 병목이어야 함');

  console.log('taskPipelineEngine.test.ts: ok');
}

run();
