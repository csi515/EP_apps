import assert from 'node:assert/strict';
import {
  approvalFSM,
  validateApprovalSteps,
  canUserProcessStep,
  canRequesterCancelApproval,
  transitionApprovalStep,
  summarizeApprovalMetrics,
  type ApprovalRequest,
  type ApprovalStepInput,
} from './approvalEngine';

console.log('=== [1] Approval Steps Validation ===');
{
  // 1. 최소 1명 이상
  const emptyRes = validateApprovalSteps('user-1', []);
  assert.equal(emptyRes.valid, false);

  // 2. 1인 자가 승인 차단
  const selfRes = validateApprovalSteps('user-1', [
    { stepOrder: 1, stepType: 'approval', approverId: 'user-1', approverName: '본인' },
  ]);
  assert.equal(selfRes.valid, false);

  // 3. 정상 2단계 승인선
  const validSteps: ApprovalStepInput[] = [
    { stepOrder: 1, stepType: 'review', approverId: 'team-lead', approverName: '팀장' },
    { stepOrder: 2, stepType: 'approval', approverId: 'director', approverName: '대표' },
  ];
  const validRes = validateApprovalSteps('user-1', validSteps);
  assert.equal(validRes.valid, true);

  const gapOrder = validateApprovalSteps('user-1', [
    { stepOrder: 1, stepType: 'review', approverId: 'a', approverName: 'A' },
    { stepOrder: 3, stepType: 'approval', approverId: 'b', approverName: 'B' },
  ]);
  assert.equal(gapOrder.valid, false);
  console.log('  -> 결재선 유효성 및 자가승인 차단 검증 통과');
}

console.log('=== [2] Approval Permission Check ===');
{
  const step = {
    id: 'step-1',
    requestId: 'req-1',
    stepOrder: 1,
    stepType: 'approval' as const,
    approverId: 'approver-1',
    approverName: '결재자',
    status: 'pending' as const,
  };

  // 본인
  assert.equal(canUserProcessStep(step, 'approver-1'), true);
  // 타인 (권한 키와 무관하게 지정자만 처리)
  assert.equal(canUserProcessStep(step, 'other-user'), false);
  assert.equal(canUserProcessStep(step, 'other-user', ['approval:admin', '*']), false);
  console.log('  -> 지정된 결재자만 처리 가능 검증 통과');
}

console.log('=== [3] Approval Step Transition (Sequential & Final) ===');
{
  const mockRequest: ApprovalRequest = {
    id: 'req-101',
    organizationId: 'org-1',
    title: '3분기 마케팅 집행 품의서',
    content: { amount: 5000000 },
    requesterId: 'user-1',
    requesterName: '마케터',
    status: 'pending',
    currentStepOrder: 1,
    totalSteps: 2,
    steps: [
      {
        id: 'step-1',
        requestId: 'req-101',
        stepOrder: 1,
        stepType: 'review',
        approverId: 'team-lead',
        approverName: '마케팅팀장',
        status: 'pending',
      },
      {
        id: 'step-2',
        requestId: 'req-101',
        stepOrder: 2,
        stepType: 'approval',
        approverId: 'ceo',
        approverName: '대표이사',
        status: 'waiting',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1단계 팀장 검토 승인
  const step1Res = transitionApprovalStep(
    mockRequest,
    'step-1',
    'approve',
    '검토 완료했습니다.',
    'data:image/svg+xml;base64,mock'
  );
  assert.equal(step1Res.success, true);
  assert.equal(step1Res.isFinalApproval, false);
  assert.equal(step1Res.updatedRequest?.currentStepOrder, 2);
  assert.equal(step1Res.updatedRequest?.steps[0].status, 'approved');
  assert.equal(step1Res.updatedRequest?.steps[1].status, 'pending'); // 다음 단계 활성화

  // 2단계 대표이사 최종 승인
  const step2Res = transitionApprovalStep(
    step1Res.updatedRequest!,
    'step-2',
    'approve',
    '집행 승인합니다.'
  );
  assert.equal(step2Res.success, true);
  assert.equal(step2Res.isFinalApproval, true);
  assert.equal(step2Res.updatedRequest?.status, 'approved');
  assert.ok(step2Res.updatedRequest?.finalApprovedAt);
  console.log('  -> 순차 다단계 승인 및 최종 승인 전이 검증 통과');
}

console.log('=== [4] Approval Rejection Transition ===');
{
  const mockRequest: ApprovalRequest = {
    id: 'req-102',
    organizationId: 'org-1',
    title: '서버 장비 구매 품의서',
    content: { amount: 15000000 },
    requesterId: 'user-2',
    requesterName: '인프라담당',
    status: 'pending',
    currentStepOrder: 1,
    totalSteps: 2,
    steps: [
      {
        id: 'step-1',
        requestId: 'req-102',
        stepOrder: 1,
        stepType: 'review',
        approverId: 'team-lead',
        approverName: '팀장',
        status: 'pending',
      },
      {
        id: 'step-2',
        requestId: 'req-102',
        stepOrder: 2,
        stepType: 'approval',
        approverId: 'cfo',
        approverName: 'CFO',
        status: 'waiting',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1단계 팀장 반려 → 초안으로 돌아가 수정·재상신
  const rejectRes = transitionApprovalStep(
    mockRequest,
    'step-1',
    'reject',
    '예산 초과로 견적 재조정 요망'
  );
  assert.equal(rejectRes.success, true);
  assert.equal(rejectRes.updatedRequest?.status, 'draft');
  assert.equal(rejectRes.updatedRequest?.steps[0].status, 'rejected');
  assert.equal(rejectRes.updatedRequest?.steps[1].status, 'waiting');
  assert.equal(rejectRes.updatedRequest?.rejectionReason, '예산 초과로 견적 재조정 요망');
  assert.equal(
    Array.isArray(rejectRes.updatedRequest?.content.rejectionHistory) &&
      (rejectRes.updatedRequest?.content.rejectionHistory as unknown[]).length,
    1
  );
  assert.equal(transitionApprovalStep(mockRequest, 'step-1', 'reject', '  ').success, false);
  console.log('  -> 반려 후 초안 복귀 및 반려 이력 보존 검증 통과');
}

console.log('=== [5] Summary Metrics ===');
{
  const requests: ApprovalRequest[] = [
    { id: '1', status: 'pending' } as ApprovalRequest,
    { id: '2', status: 'approved' } as ApprovalRequest,
    { id: '3', status: 'rejected' } as ApprovalRequest,
    { id: '4', status: 'approved' } as ApprovalRequest,
  ];
  const metrics = summarizeApprovalMetrics(requests);
  assert.equal(metrics.totalCount, 4);
  assert.equal(metrics.pendingCount, 1);
  assert.equal(metrics.approvedCount, 2);
  assert.equal(metrics.rejectedCount, 1);
  console.log('  -> 결재 현황 메트릭스 집계 검증 통과');
}

console.log('=== [6] Requester cancel ===');
{
  assert.equal(
    canRequesterCancelApproval({
      status: 'pending',
      requesterId: 'u1',
      viewerUserId: 'u1',
      allowRequesterCancel: true,
    }),
    true
  );
  assert.equal(
    canRequesterCancelApproval({
      status: 'pending',
      requesterId: 'u1',
      viewerUserId: 'u1',
      allowRequesterCancel: false,
    }),
    false
  );
  assert.equal(
    canRequesterCancelApproval({
      status: 'approved',
      requesterId: 'u1',
      viewerUserId: 'u1',
    }),
    false
  );
  assert.equal(
    canRequesterCancelApproval({
      status: 'pending',
      requesterId: 'u1',
      viewerUserId: 'u2',
    }),
    false
  );
  console.log('  -> 기안자 회수 가능 여부 검증 통과');
}

console.log('=== [7] Invalid transition fail-closed ===');
{
  const mockRequest: ApprovalRequest = {
    id: 'req-invalid',
    organizationId: 'org-1',
    title: 'fail-closed',
    content: {},
    requesterId: 'user-1',
    requesterName: '기안',
    status: 'pending',
    currentStepOrder: 1,
    totalSteps: 2,
    steps: [
      {
        id: 'step-1',
        requestId: 'req-invalid',
        stepOrder: 1,
        stepType: 'review',
        approverId: 'team-lead',
        approverName: '팀장',
        status: 'pending',
      },
      {
        id: 'step-2',
        requestId: 'req-invalid',
        stepOrder: 2,
        stepType: 'approval',
        approverId: 'ceo',
        approverName: '대표',
        status: 'waiting',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const approvedDoc = { ...mockRequest, status: 'approved' as const };
  const closed = transitionApprovalStep(approvedDoc, 'step-1', 'approve', 'late');
  assert.equal(closed.success, false);
  assert.ok(closed.error);

  const missingStep = transitionApprovalStep(mockRequest, 'step-missing', 'approve');
  assert.equal(missingStep.success, false);

  const skipWaiting = transitionApprovalStep(mockRequest, 'step-2', 'approve', '순서 건너뜀');
  assert.equal(skipWaiting.success, false);

  const step1Done = transitionApprovalStep(mockRequest, 'step-1', 'approve', '1차 OK');
  assert.equal(step1Done.success, true);
  const doubleAct = transitionApprovalStep(step1Done.updatedRequest!, 'step-1', 'approve', '중복');
  assert.equal(doubleAct.success, false);

  const waitingStep = mockRequest.steps[1];
  assert.equal(canUserProcessStep(waitingStep, 'ceo'), false);
  console.log('  -> 잘못된 단계·상태 전이 차단 검증 통과');
}

console.log('=== [8] Document-level approval FSM ===');
{
  const submit = approvalFSM.transition('draft', 'SUBMIT');
  assert.equal(submit.success, true);
  assert.equal(submit.toState, 'pending');

  const approve = approvalFSM.transition('pending', 'APPROVE');
  assert.equal(approve.success, true);
  assert.equal(approve.toState, 'approved');

  const reject = approvalFSM.transition('pending', 'REJECT');
  assert.equal(reject.success, true);
  assert.equal(reject.toState, 'draft');

  const cancel = approvalFSM.transition('pending', 'CANCEL');
  assert.equal(cancel.success, true);
  assert.equal(cancel.toState, 'canceled');

  const illegalFromDraft = approvalFSM.transition('draft', 'APPROVE');
  assert.equal(illegalFromDraft.success, false);
  assert.equal(illegalFromDraft.toState, 'draft');

  const illegalFromFinal = approvalFSM.transition('approved', 'SUBMIT');
  assert.equal(illegalFromFinal.success, false);
  assert.equal(illegalFromFinal.toState, 'approved');
  console.log('  -> 문서 FSM 허용·금지 전이 검증 통과');
}

console.log('=== [9] Reject after partial multi-step approve ===');
{
  const mockRequest: ApprovalRequest = {
    id: 'req-partial-reject',
    organizationId: 'org-1',
    title: '2단계 중 최종 반려',
    content: {},
    requesterId: 'user-1',
    requesterName: '기안',
    status: 'pending',
    currentStepOrder: 1,
    totalSteps: 2,
    steps: [
      {
        id: 'step-1',
        requestId: 'req-partial-reject',
        stepOrder: 1,
        stepType: 'review',
        approverId: 'team-lead',
        approverName: '팀장',
        status: 'pending',
      },
      {
        id: 'step-2',
        requestId: 'req-partial-reject',
        stepOrder: 2,
        stepType: 'approval',
        approverId: 'ceo',
        approverName: '대표',
        status: 'waiting',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const afterStep1 = transitionApprovalStep(mockRequest, 'step-1', 'approve', '1차 통과');
  assert.equal(afterStep1.success, true);
  const rejectFinal = transitionApprovalStep(
    afterStep1.updatedRequest!,
    'step-2',
    'reject',
    '최종 승인 단계에서 보류'
  );
  assert.equal(rejectFinal.success, true);
  assert.equal(rejectFinal.updatedRequest?.status, 'draft');
  assert.equal(rejectFinal.updatedRequest?.steps[0].status, 'approved');
  assert.equal(rejectFinal.updatedRequest?.steps[1].status, 'rejected');
  console.log('  -> 다단계 중 최종 단계 반려 검증 통과');
}

console.log('\n[PASS] approvalEngine.test.ts: 모든 도메인 불변식 검증 성공');
