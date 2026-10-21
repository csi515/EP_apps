/**
 * 연구 게이트 ↔ approval_workflow 연계 (순수 도메인)
 */

import type { ResearchGate, ResearchProject } from './researchProjectEngine';

/** approval_requests.status와 동일한 문자열 집합 (타 Capability import 금지) */
export type GateLinkedApprovalStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'canceled';

export const RESEARCH_GATE_APPROVAL_ENTITY_TYPE = 'research_project_gate';

export function buildGateApprovalRequestValues(params: {
  project: ResearchProject;
  gate: ResearchGate;
  requesterName: string;
  requesterId?: string | null;
  gateNote?: string;
}): Record<string, unknown> {
  const { project, gate, requesterName, requesterId, gateNote } = params;
  return {
    title: `[연구 게이트 ${gate.gateOrder}차] ${project.title} — ${gate.title}`,
    content: {
      project_id: project.id,
      project_code: project.code,
      project_title: project.title,
      gate_id: gate.id,
      gate_order: gate.gateOrder,
      gate_title: gate.title,
      gate_criteria: gate.criteria,
      submit_note: gateNote?.trim() || '',
      budget_planned: project.budget.planned,
      budget_spent: project.budget.spent,
      lead_name: project.members.find((m) => m.role === 'lead')?.memberName,
    },
    requester_name: requesterName,
    requester_id: requesterId ?? null,
    status: 'pending',
    current_step_order: 1,
    total_steps: 2,
    entity_type: RESEARCH_GATE_APPROVAL_ENTITY_TYPE,
    entity_id: gate.id,
  };
}

export interface GateApprovalStepSeed {
  organization_id: string;
  request_id: string;
  step_order: number;
  step_type: 'review' | 'approval' | 'consensus';
  approver_name: string;
  approver_role?: string;
  status: 'waiting' | 'pending';
}

export function buildDefaultGateApprovalSteps(
  organizationId: string,
  requestId: string,
  finalApproverName = '연구소장'
): GateApprovalStepSeed[] {
  return [
    {
      organization_id: organizationId,
      request_id: requestId,
      step_order: 1,
      step_type: 'review',
      approver_name: '연구팀장(검토)',
      approver_role: 'reviewer',
      status: 'pending',
    },
    {
      organization_id: organizationId,
      request_id: requestId,
      step_order: 2,
      step_type: 'approval',
      approver_name: finalApproverName,
      approver_role: 'approver',
      status: 'waiting',
    },
  ];
}

export function gateDecisionFromApprovalStatus(
  status: GateLinkedApprovalStatus
): 'approved' | 'rejected' | null {
  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  return null;
}

export function shouldSyncGateFromApproval(
  gate: ResearchGate,
  approvalStatus: GateLinkedApprovalStatus
): boolean {
  if (!gate.approvalRequestId) return false;
  if (gate.status !== 'in_approval') return false;
  return approvalStatus === 'approved' || approvalStatus === 'rejected';
}

export function canSubmitGateToApprovalWorkflow(
  gate: ResearchGate,
  hasApprovalCapability: boolean
): { allowed: boolean; reason?: string } {
  if (!hasApprovalCapability) {
    return { allowed: false, reason: '전자결재(approval_workflow) Capability가 활성화되어 있지 않습니다.' };
  }
  if (gate.status !== 'pending') {
    return { allowed: false, reason: '대기(pending) 상태의 게이트만 결재 상신할 수 있습니다.' };
  }
  if (gate.approvalRequestId) {
    return { allowed: false, reason: '이미 결재 문서가 연결된 게이트입니다.' };
  }
  return { allowed: true };
}
