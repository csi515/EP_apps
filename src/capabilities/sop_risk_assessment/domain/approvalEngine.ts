/**
 * 작업표준·위험성평가 3단계 결재선(작성-검토-승인) 순수 도메인 엔진
 * - 상태 머신 전이 / 권한 판정 / 개정 검증 / WORM 스냅샷 페이로드
 */

export type DocumentStatus =
  | 'DRAFT'
  | 'REVIEW_PENDING'
  | 'APPROVAL_PENDING'
  | 'APPROVED'
  | 'LOCKED';

export type ApprovalAction = 'SUBMIT' | 'APPROVE' | 'REJECT' | 'REVISE';
export type StepType = 'DRAFT' | 'REVIEW' | 'APPROVE';
export type RevisionType = 'INITIAL' | 'PERIODIC' | 'OCCASIONAL';

export interface ApprovalMember {
  userId: string;
  role: string;
  permissions?: string[];
  displayName?: string;
}

export interface ApprovalStepState {
  stepOrder: 1 | 2 | 3;
  stepType: StepType;
  assigneeId: string;
  assigneeName?: string;
  actionStatus: 'WAIT' | 'APPROVED' | 'REJECTED';
}

export interface RevisionPayload {
  revisionType: RevisionType;
  revisionReason: string;
  title?: string;
  processName?: string;
}

export interface WormSnapshotInput {
  assessmentId: string;
  documentNo: string;
  title: string;
  processName: string;
  departmentId?: string | null;
  currentVersion: number;
  status: DocumentStatus;
  payload?: Record<string, unknown>;
  approvedBy: string;
  revisionType: RevisionType;
  revisionReason: string;
}

/**
 * 직급·권한·현재 단계 정합 판정
 */
export function canPerformApprovalAction(
  member: ApprovalMember,
  currentStep: ApprovalStepState | null,
  docStatus: DocumentStatus
): boolean {
  if (!member?.userId || !currentStep) return false;
  if (currentStep.actionStatus !== 'WAIT') return false;
  if (currentStep.assigneeId !== member.userId) return false;

  const perms = member.permissions ?? [];
  const role = member.role;

  if (currentStep.stepOrder === 2 && docStatus === 'REVIEW_PENDING') {
    return (
      role === 'owner' ||
      role === 'admin' ||
      role === 'manager' ||
      perms.includes('safety:assessment:review') ||
      perms.includes('safety.assessment.review')
    );
  }

  if (currentStep.stepOrder === 3 && docStatus === 'APPROVAL_PENDING') {
    return (
      role === 'owner' ||
      perms.includes('safety:assessment:approve') ||
      perms.includes('safety.assessment.approve')
    );
  }

  return false;
}

/**
 * 결재 상태 머신 전이 순수 함수
 */
export function getNextDocumentStatus(
  currentStatus: DocumentStatus,
  action: ApprovalAction,
  stepOrder?: number
): DocumentStatus {
  if (action === 'SUBMIT' && currentStatus === 'DRAFT') {
    return 'REVIEW_PENDING';
  }

  if (action === 'APPROVE') {
    if (currentStatus === 'REVIEW_PENDING' && stepOrder === 2) {
      return 'APPROVAL_PENDING';
    }
    if (currentStatus === 'APPROVAL_PENDING' && stepOrder === 3) {
      return 'APPROVED';
    }
  }

  if (action === 'REJECT' && (currentStatus === 'REVIEW_PENDING' || currentStatus === 'APPROVAL_PENDING')) {
    return 'DRAFT';
  }

  if (action === 'REVISE' && (currentStatus === 'APPROVED' || currentStatus === 'LOCKED')) {
    return 'DRAFT';
  }

  return currentStatus;
}

/**
 * 제·개정 사유 및 필수 입력 검증
 */
export function validateRevisionPayload(payload: RevisionPayload): {
  isValid: boolean;
  error?: string;
} {
  if (!payload) {
    return { isValid: false, error: '개정 정보가 필요합니다.' };
  }
  if (!payload.revisionType || !['INITIAL', 'PERIODIC', 'OCCASIONAL'].includes(payload.revisionType)) {
    return { isValid: false, error: '개정 유형(INITIAL/PERIODIC/OCCASIONAL)이 올바르지 않습니다.' };
  }
  if (!payload.revisionReason || payload.revisionReason.trim().length === 0) {
    return { isValid: false, error: '개정 사유는 필수입니다.' };
  }
  if (payload.revisionType !== 'INITIAL' && payload.revisionReason.trim().length < 4) {
    return { isValid: false, error: '개정 사유를 구체적으로 입력해 주세요.' };
  }
  return { isValid: true };
}

/**
 * 반려 사유 필수 가드
 */
export function validateRejectReason(reason: string | null | undefined): {
  isValid: boolean;
  error?: string;
} {
  if (!reason || reason.trim().length === 0) {
    return { isValid: false, error: '반려 사유(보완 요청 사항)는 필수입니다.' };
  }
  return { isValid: true };
}

/**
 * 최종 승인 시 WORM 스냅샷 페이로드 생성
 */
export function buildWormSnapshotPayload(input: WormSnapshotInput): {
  version: number;
  revisionType: RevisionType;
  revisionReason: string;
  approvedBy: string;
  snapshot: Record<string, unknown>;
} {
  return {
    version: input.currentVersion,
    revisionType: input.revisionType,
    revisionReason: input.revisionReason.trim(),
    approvedBy: input.approvedBy,
    snapshot: {
      id: input.assessmentId,
      document_no: input.documentNo,
      title: input.title,
      process_name: input.processName,
      department_id: input.departmentId ?? null,
      current_version: input.currentVersion,
      status: 'APPROVED',
      payload: input.payload ?? {},
    },
  };
}

/**
 * 개정 시 다음 버전 번호
 */
export function nextRevisionVersion(currentVersion: number): number {
  return Math.max(1, Math.floor(currentVersion)) + 1;
}

/**
 * 아차사고 연계: 수시 평가 검토 필요 여부
 */
export function shouldShowOccasionalReviewBadge(input: {
  status: DocumentStatus;
  occasionalReviewRequired: boolean;
  hasLinkedIncident: boolean;
}): boolean {
  if (input.status !== 'APPROVED' && input.status !== 'LOCKED') return false;
  return input.occasionalReviewRequired || input.hasLinkedIncident;
}

/**
 * 작업자 재서약 필요 여부 (개정 버전 미확인)
 */
export function requiresWorkerRepledge(input: {
  approvedVersion: number;
  lastPledgedVersion: number | null;
  departmentMatches: boolean;
}): boolean {
  if (!input.departmentMatches) return false;
  if (input.approvedVersion < 1) return false;
  return (input.lastPledgedVersion ?? 0) < input.approvedVersion;
}

/**
 * 당일 작업 출결/티켓 활성화 가능 여부 (재서약 Fail-Closed)
 */
export function canActivateDailyWorkTicket(input: {
  hasPendingRepledge: boolean;
  repledgeCompletedToday: boolean;
}): boolean {
  if (!input.hasPendingRepledge) return true;
  return input.repledgeCompletedToday;
}

export function formatApprovalStepLabel(step: ApprovalStepState): string {
  const names: Record<StepType, string> = {
    DRAFT: '작성',
    REVIEW: '검토',
    APPROVE: '승인',
  };
  const mark =
    step.actionStatus === 'APPROVED' ? '✓' : step.actionStatus === 'REJECTED' ? '✗' : '⏳';
  const who = step.assigneeName?.trim() || '미배정';
  return `${step.stepOrder}. ${names[step.stepType]}(${who}) ${mark}`;
}
