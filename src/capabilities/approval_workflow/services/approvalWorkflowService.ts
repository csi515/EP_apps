/**
 * 전자결재 서비스 — 원자 RPC, 결재선 생성, 구성원 조회
 */

import { getCoreClient } from '@/lib/supabase';
import type { Json } from '@/lib/supabase/database.types';
import {
  buildTwoStepApprovalLine,
  stepSeedRows,
  validateChosenApprovers,
  type ApprovalAssignee,
} from '../domain/approvalLine';

export {
  deactivateApprovalLine,
  listSavedApprovalLines,
  saveApprovalLine,
  type SavedApprovalLine,
} from './approvalLineTemplateService';

function asJson(value: Record<string, unknown> | unknown[]): Json {
  return value as Json;
}

const RESEARCH_GATE_ENTITY_TYPE = 'research_project_gate';

export type ApprovalMemberOption = {
  userId: string;
  name: string;
  role: string;
};

export type ApprovalStepRow = {
  id: string;
  request_id: string;
  step_order: number;
  step_type: string;
  approver_id: string | null;
  approver_name: string;
  status: string;
  comment?: string | null;
};

export type ApprovalRequestRow = {
  id: string;
  organization_id?: string;
  title: string;
  status: string;
  requester_id?: string | null;
  requester_name: string;
  current_step_order: number;
  total_steps: number;
  content?: Record<string, unknown> | null;
  entity_type?: string | null;
  entity_id?: string | null;
  rejection_reason?: string | null;
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

export function isResourceReservationApprovalEntity(entityType?: string | null): boolean {
  return entityType === 'resource_reservation';
}

export function isMboPlanApprovalEntity(entityType?: string | null): boolean {
  return entityType === 'mbo_plan';
}

export function isResearchGateApprovalEntity(entityType?: string | null): boolean {
  return entityType === RESEARCH_GATE_ENTITY_TYPE;
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function listApprovalOrgMembers(organizationId: string): Promise<ApprovalMemberOption[]> {
  const client = getCoreClient();
  const joined = await client
    .from('organization_members')
    .select('user_id, role, profiles!organization_members_user_id_fkey(full_name)')
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  if (!joined.error && joined.data) {
    return (joined.data as unknown as Array<Record<string, unknown>>).map((row) => {
      const profile = firstRow(row.profiles as { full_name: string | null } | { full_name: string | null }[] | null);
      const userId = String(row.user_id);
      const role = String(row.role ?? 'staff');
      return {
        userId,
        role,
        name: profile?.full_name?.trim() || role,
      };
    });
  }

  const fallback = await client
    .from('organization_members')
    .select('user_id, role')
    .eq('organization_id', organizationId)
    .eq('is_active', true);
  if (fallback.error) throw new Error(fallback.error.message);
  return (fallback.data ?? []).map((row) => ({
    userId: row.user_id,
    role: row.role,
    name: row.role,
  }));
}

export async function createApprovalWithChosenLine(input: {
  organizationId: string;
  title: string;
  content: Record<string, unknown>;
  requesterId: string;
  requesterName: string;
  reviewer: ApprovalAssignee;
  approver: ApprovalAssignee;
  entityType?: string | null;
  entityId?: string | null;
}): Promise<{ requestId: string }> {
  const check = validateChosenApprovers({
    requesterId: input.requesterId,
    reviewerId: input.reviewer.userId,
    approverId: input.approver.userId,
  });
  if (!check.valid) {
    throw new Error(check.error ?? '결재선이 올바르지 않습니다.');
  }

  const steps = buildTwoStepApprovalLine({
    reviewer: input.reviewer,
    approver: input.approver,
  });
  const client = getCoreClient();
  const { data, error } = await client
    .from('approval_requests')
    .insert({
      organization_id: input.organizationId,
      title: input.title.trim(),
      content: asJson(input.content),
      requester_id: input.requesterId,
      requester_name: input.requesterName,
      status: 'pending',
      current_step_order: 1,
      total_steps: steps.length,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  const requestId = String(data.id);

  const { error: stepError } = await client.from('approval_steps').insert(
    stepSeedRows({
      organizationId: input.organizationId,
      requestId,
      steps,
    })
  );
  if (stepError) {
    await client.from('approval_requests').delete().eq('id', requestId);
    throw new Error(stepError.message);
  }
  return { requestId };
}

export async function resubmitApprovalDraft(input: {
  requestId: string;
  title: string;
  content: Record<string, unknown>;
  reviewer: ApprovalAssignee;
  approver: ApprovalAssignee;
  requesterId: string;
}): Promise<void> {
  const check = validateChosenApprovers({
    requesterId: input.requesterId,
    reviewerId: input.reviewer.userId,
    approverId: input.approver.userId,
  });
  if (!check.valid) {
    throw new Error(check.error ?? '결재선이 올바르지 않습니다.');
  }

  const client = getCoreClient();
  const { data: current, error: loadError } = await client
    .from('approval_requests')
    .select('id, status, organization_id, content')
    .eq('id', input.requestId)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);
  if (!current || current.status !== 'draft') {
    throw new Error('반려된 초안만 다시 상신할 수 있습니다.');
  }

  const previousContent =
    current.content && typeof current.content === 'object' && !Array.isArray(current.content)
      ? (current.content as Record<string, unknown>)
      : {};
  const mergedContent: Record<string, unknown> = {
    ...previousContent,
    ...input.content,
    rejectionHistory: previousContent.rejectionHistory ?? input.content.rejectionHistory ?? [],
  };

  const steps = buildTwoStepApprovalLine({
    reviewer: input.reviewer,
    approver: input.approver,
  });

  const { error: updateError } = await client
    .from('approval_requests')
    .update({
      title: input.title.trim(),
      content: asJson(mergedContent),
      status: 'pending',
      current_step_order: 1,
      total_steps: steps.length,
      rejection_reason: null,
      rejected_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.requestId)
    .eq('status', 'draft');
  if (updateError) throw new Error(updateError.message);

  await client.from('approval_steps').delete().eq('request_id', input.requestId);
  const { error: stepError } = await client.from('approval_steps').insert(
    stepSeedRows({
      organizationId: String(current.organization_id),
      requestId: input.requestId,
      steps,
    })
  );
  if (stepError) throw new Error(stepError.message);
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
