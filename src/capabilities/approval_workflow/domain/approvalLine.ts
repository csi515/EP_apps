import type { ApprovalStepInput } from './approvalEngine';
import { validateApprovalSteps } from './approvalEngine';

export type ApprovalAssignee = {
  userId: string;
  name: string;
};

export type RejectionHistoryNote = {
  id: string;
  stepOrder: number;
  stepLabel: string;
  reason: string;
  rejectedAt: string;
};

/**
 * 기안자가 고른 검토자·승인자로 2단계 결재선을 만든다.
 */
export function buildTwoStepApprovalLine(input: {
  reviewer: ApprovalAssignee;
  approver: ApprovalAssignee;
}): ApprovalStepInput[] {
  return [
    {
      stepOrder: 1,
      stepType: 'review',
      approverId: input.reviewer.userId,
      approverName: input.reviewer.name,
      approverRole: 'reviewer',
    },
    {
      stepOrder: 2,
      stepType: 'approval',
      approverId: input.approver.userId,
      approverName: input.approver.name,
      approverRole: 'approver',
    },
  ];
}

export function validateChosenApprovers(input: {
  requesterId: string;
  reviewerId: string;
  approverId: string;
}): { valid: boolean; error?: string } {
  if (!input.reviewerId.trim()) {
    return { valid: false, error: '검토자를 선택해 주세요.' };
  }
  if (!input.approverId.trim()) {
    return { valid: false, error: '최종 승인자를 선택해 주세요.' };
  }
  if (input.reviewerId === input.approverId) {
    return { valid: false, error: '검토자와 최종 승인자는 서로 다른 사람이어야 합니다.' };
  }
  const steps = buildTwoStepApprovalLine({
    reviewer: { userId: input.reviewerId, name: '검토자' },
    approver: { userId: input.approverId, name: '승인자' },
  });
  return validateApprovalSteps(input.requesterId, steps);
}

export function readRejectionHistory(content: Record<string, unknown> | null | undefined): RejectionHistoryNote[] {
  if (!content || !Array.isArray(content.rejectionHistory)) return [];
  return content.rejectionHistory
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const reason = typeof row.reason === 'string' ? row.reason.trim() : '';
      if (!reason) return null;
      const stepOrder = typeof row.stepOrder === 'number' ? row.stepOrder : Number(row.stepOrder) || 1;
      return {
        id: typeof row.id === 'string' ? row.id : `reject-${index + 1}`,
        stepOrder,
        stepLabel:
          typeof row.stepLabel === 'string'
            ? row.stepLabel
            : stepOrder === 1
              ? '검토'
              : '최종 승인',
        reason,
        rejectedAt: typeof row.rejectedAt === 'string' ? row.rejectedAt : '',
      };
    })
    .filter((note): note is RejectionHistoryNote => note !== null);
}

export function appendRejectionHistory(
  content: Record<string, unknown>,
  note: Omit<RejectionHistoryNote, 'id'> & { id?: string }
): Record<string, unknown> {
  const previous = readRejectionHistory(content);
  const next: RejectionHistoryNote = {
    id: note.id ?? `reject-${Date.now()}`,
    stepOrder: note.stepOrder,
    stepLabel: note.stepLabel,
    reason: note.reason,
    rejectedAt: note.rejectedAt,
  };
  return {
    ...content,
    rejectionHistory: [...previous, next],
  };
}

export type ApprovalStepSeedRow = {
  organization_id: string;
  request_id: string;
  step_order: number;
  step_type: ApprovalStepInput['stepType'];
  approver_id: string;
  approver_name: string;
  approver_role: string | null;
  status: 'pending' | 'waiting';
};

export function stepSeedRows(input: {
  organizationId: string;
  requestId: string;
  steps: ApprovalStepInput[];
}): ApprovalStepSeedRow[] {
  return input.steps.map((step, index) => ({
    organization_id: input.organizationId,
    request_id: input.requestId,
    step_order: step.stepOrder,
    step_type: step.stepType,
    approver_id: step.approverId,
    approver_name: step.approverName,
    approver_role: step.approverRole ?? null,
    status: index === 0 ? 'pending' : 'waiting',
  }));
}

/** 저장된 결재선(템플릿) 기본 단계 JSON */
export type SavedApprovalLineSteps = {
  reviewer: ApprovalAssignee;
  approver: ApprovalAssignee;
};

export function validateSavedLineTitle(title: string): { valid: boolean; error?: string } {
  const trimmed = title.trim();
  if (!trimmed) return { valid: false, error: '결재선 이름을 입력해 주세요.' };
  if (trimmed.length > 80) return { valid: false, error: '결재선 이름은 80자 이하여야 합니다.' };
  return { valid: true };
}

export function buildSavedLineDefaultSteps(input: SavedApprovalLineSteps): ApprovalStepInput[] {
  return buildTwoStepApprovalLine(input);
}

export function parseSavedLineDefaultSteps(value: unknown): SavedApprovalLineSteps | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const review = value.find((row) => {
    if (!row || typeof row !== 'object') return false;
    const step = row as Record<string, unknown>;
    return step.stepType === 'review' || step.stepOrder === 1 || step.step_order === 1;
  }) as Record<string, unknown> | undefined;
  const approve = value.find((row) => {
    if (!row || typeof row !== 'object') return false;
    const step = row as Record<string, unknown>;
    return step.stepType === 'approval' || step.stepOrder === 2 || step.step_order === 2;
  }) as Record<string, unknown> | undefined;
  if (!review || !approve) return null;

  const reviewerId = String(review.approverId ?? review.approver_id ?? '').trim();
  const approverId = String(approve.approverId ?? approve.approver_id ?? '').trim();
  if (!reviewerId || !approverId || reviewerId === approverId) return null;

  return {
    reviewer: {
      userId: reviewerId,
      name: String(review.approverName ?? review.approver_name ?? '검토자'),
    },
    approver: {
      userId: approverId,
      name: String(approve.approverName ?? approve.approver_name ?? '승인자'),
    },
  };
}

export function serializeSavedLineDefaultSteps(input: SavedApprovalLineSteps): ApprovalStepInput[] {
  return buildSavedLineDefaultSteps(input);
}
