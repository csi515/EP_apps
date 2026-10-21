/**
 * 전자결재 서비스 — 원자 RPC 및 결재 단계 조회
 */

import { getCoreClient } from '@/lib/supabase';

const RESEARCH_GATE_ENTITY_TYPE = 'research_project_gate';

export type ApprovalStepRow = {
  id: string;
  request_id: string;
  step_order: number;
  step_type: string;
  approver_name: string;
  status: string;
};

export type ApprovalRequestRow = {
  id: string;
  title: string;
  status: string;
  requester_name: string;
  current_step_order: number;
  total_steps: number;
  entity_type?: string | null;
  entity_id?: string | null;
  created_at?: string;
};

export interface ProcessApprovalStepResult {
  success: boolean;
  error?: string;
  action?: 'approved' | 'rejected';
  isFinal?: boolean;
}

export function findPendingStepForRequest(
  request: ApprovalRequestRow,
  steps: ApprovalStepRow[]
): ApprovalStepRow | undefined {
  return steps.find(
    (s) =>
      s.request_id === request.id &&
      s.status === 'pending' &&
      s.step_order === request.current_step_order
  );
}

export function isResearchGateApprovalEntity(entityType?: string | null): boolean {
  return entityType === RESEARCH_GATE_ENTITY_TYPE;
}

export async function processApprovalStepAtomic(params: {
  requestId: string;
  stepId: string;
  action: 'approve' | 'reject';
  comment?: string;
  signatureUrl?: string;
}): Promise<ProcessApprovalStepResult> {
  const client = getCoreClient();
  const { data, error } = await client.rpc('process_approval_step_atomic' as never, {
    p_request_id: params.requestId,
    p_step_id: params.stepId,
    p_action: params.action,
    p_comment: params.comment ?? null,
    p_signature_url: params.signatureUrl ?? null,
  } as never);

  if (error) {
    return { success: false, error: error.message };
  }

  const payload = data as Record<string, unknown> | null;
  if (!payload || payload.success !== true) {
    const code = typeof payload?.error === 'string' ? payload.error : 'APPROVAL_RPC_FAILED';
    return { success: false, error: code };
  }

  return {
    success: true,
    action: payload.action === 'rejected' ? 'rejected' : 'approved',
    isFinal: payload.is_final === true,
  };
}
