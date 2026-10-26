import assert from 'node:assert/strict';
import {
  buildWormSnapshotPayload,
  canPerformApprovalAction,
  getNextDocumentStatus,
  validateRejectReason,
  validateRevisionPayload,
  type ApprovalMember,
  type ApprovalStepState,
} from './approvalEngine';

console.log('--- Testing sop_risk_assessment approvalEngine ---');

// [케이스 1] 작성자가 검토 요청 시 상태가 REVIEW_PENDING으로 정상 전이
{
  const next = getNextDocumentStatus('DRAFT', 'SUBMIT');
  assert.equal(next, 'REVIEW_PENDING');
  console.log('✅ Case 1: SUBMIT DRAFT → REVIEW_PENDING');
}

// [케이스 2] 검토자가 반려 시 사유 필수, 상태 DRAFT 환원
{
  const invalid = validateRejectReason('   ');
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.error?.includes('필수'));

  const valid = validateRejectReason('PPE 항목 보완 필요');
  assert.equal(valid.isValid, true);

  const next = getNextDocumentStatus('REVIEW_PENDING', 'REJECT', 2);
  assert.equal(next, 'DRAFT');
  console.log('✅ Case 2: REJECT requires reason and returns DRAFT');
}

// [케이스 3] 지정된 사람이면 직급과 관계없이 그 단계만 처리
{
  const staff: ApprovalMember = {
    userId: 'u-staff',
    role: 'staff',
    permissions: [],
  };
  const finalStep: ApprovalStepState = {
    stepOrder: 3,
    stepType: 'APPROVE',
    assigneeId: 'u-staff',
    actionStatus: 'WAIT',
  };
  assert.equal(canPerformApprovalAction(staff, finalStep, 'APPROVAL_PENDING'), true);

  const other: ApprovalMember = {
    userId: 'u-other',
    role: 'owner',
    permissions: [],
  };
  assert.equal(canPerformApprovalAction(other, finalStep, 'APPROVAL_PENDING'), false);
  console.log('✅ Case 3: only the designated assignee can act');
}

// [케이스 4] 최종 승인 시 WORM 스냅샷 페이로드 정확 생성
{
  const worm = buildWormSnapshotPayload({
    assessmentId: 'a-1',
    documentNo: 'RA-2026-001',
    title: '리프트 하부 정비 위험성평가',
    processName: '차량 리프트 하부 정비',
    departmentId: 'dept-1',
    currentVersion: 2,
    status: 'APPROVAL_PENDING',
    payload: { hazards: [{ id: 'h-1', score: 20 }] },
    approvedBy: 'u-owner',
    revisionType: 'PERIODIC',
    revisionReason: '연 1회 정기 개정',
  });

  assert.equal(worm.version, 2);
  assert.equal(worm.revisionType, 'PERIODIC');
  assert.equal(worm.approvedBy, 'u-owner');
  assert.equal(worm.snapshot.status, 'APPROVED');
  assert.equal(worm.snapshot.document_no, 'RA-2026-001');
  assert.equal(worm.snapshot.current_version, 2);
  assert.deepEqual(worm.snapshot.payload, { hazards: [{ id: 'h-1', score: 20 }] });

  const approveNext = getNextDocumentStatus('APPROVAL_PENDING', 'APPROVE', 3);
  assert.equal(approveNext, 'APPROVED');

  const revisionCheck = validateRevisionPayload({
    revisionType: 'OCCASIONAL',
    revisionReason: '아차사고 후 수시 평가',
  });
  assert.equal(revisionCheck.isValid, true);
  console.log('✅ Case 4: WORM snapshot payload and final APPROVE transition');
}

console.log('🎉 All approvalEngine tests passed!');
