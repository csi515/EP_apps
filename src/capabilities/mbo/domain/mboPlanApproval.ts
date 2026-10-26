/**
 * MBO 계획 상신 ↔ approval_workflow 연계 (순수 도메인)
 */

export function readMboRequirePlanApproval(
  settings: Record<string, unknown> | null | undefined
): boolean {
  if (!settings) return true;
  const nested = (settings.mbo ?? settings.capability_mbo ?? {}) as Record<string, unknown>;
  if (typeof nested.require_plan_approval === 'boolean') {
    return nested.require_plan_approval;
  }
  if (typeof settings.require_plan_approval === 'boolean') {
    return settings.require_plan_approval;
  }
  return true;
}

export function canSubmitMboPlanToApprovalWorkflow(input: {
  requirePlanApproval: boolean;
  hasApprovalWorkflow: boolean;
  objectiveStatus: string;
}): { allowed: boolean; reason?: string } {
  if (input.objectiveStatus !== 'draft' && input.objectiveStatus !== 'rejected') {
    return { allowed: false, reason: '초안 또는 반려 상태의 목표만 상신할 수 있습니다.' };
  }
  if (!input.requirePlanApproval) {
    return { allowed: true };
  }
  if (!input.hasApprovalWorkflow) {
    return {
      allowed: false,
      reason: '계획 승인 필수인데 전자결재(approval_workflow)가 비활성입니다.',
    };
  }
  return { allowed: true };
}

export function buildMboPlanApprovalContent(input: {
  title: string;
  description?: string | null;
  successCriteria?: string | null;
  ownerName?: string | null;
}): Record<string, unknown> {
  return {
    kind: 'mbo_plan',
    title: input.title,
    description: input.description ?? '',
    success_criteria: input.successCriteria ?? '',
    owner_name: input.ownerName ?? '',
  };
}
