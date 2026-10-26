import { getCoreClient } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/database.types';
import { generateSopDocNo, getNextSequenceNumber } from '../domain/sopNumberingAndAuditEngine';
import {
  addStep,
  buildSnapshotPayload,
  emptyDocumentBody,
  readDocumentBody,
  type RejectionNote,
  type SopDocumentBody,
} from '../domain/sopStepDocument';

export { listOrgMembers } from './listOrgMembers';

export type RiskAssessmentRow = {
  id: string;
  organization_id: string;
  department_id: string | null;
  document_no: string;
  title: string;
  process_name: string;
  current_version: number;
  status: string;
  created_by: string;
  snapshot_payload: Record<string, unknown>;
  occasional_review_required: boolean;
  created_at: string;
  updated_at: string;
};

export type ApprovalLineRow = {
  id: string;
  assessment_id: string;
  organization_id: string;
  step_order: number;
  step_type: string;
  assignee_id: string;
  assignee_name: string | null;
  action_status: string;
  comment: string | null;
  signature_data: string | null;
  action_at: string | null;
};

export type RevisionRow = {
  id: string;
  assessment_id: string;
  version: number;
  revision_type: string;
  revision_reason: string;
  snapshot_payload: Record<string, unknown>;
  approved_by: string;
  approved_at: string;
};

export async function listMyPendingApprovalLines(userId: string): Promise<ApprovalLineRow[]> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('document_approval_lines' as never)
    .select('*')
    .eq('assignee_id', userId)
    .eq('action_status', 'WAIT')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ApprovalLineRow[];
}

export async function listRiskAssessments(organizationId: string): Promise<RiskAssessmentRow[]> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('risk_assessments' as never)
    .select('*')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as RiskAssessmentRow[];
}

export async function listApprovalLines(assessmentId: string): Promise<ApprovalLineRow[]> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('document_approval_lines' as never)
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('step_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ApprovalLineRow[];
}

export async function listRevisions(assessmentId: string): Promise<RevisionRow[]> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('risk_assessment_revisions' as never)
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('version', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as RevisionRow[];
}

export async function submitForReview(assessmentId: string, reviewerId: string): Promise<void> {
  const client = getCoreClient();
  const { error } = await client.rpc('submit_risk_assessment_for_review' as never, {
    p_assessment_id: assessmentId,
    p_reviewer_id: reviewerId,
  } as never);
  if (error) throw new Error(error.message);
}

export async function approveStep(input: {
  assessmentId: string;
  stepOrder: number;
  comment?: string;
  signature: string;
  nextAssigneeId?: string | null;
}): Promise<void> {
  const client = getCoreClient();
  const { error } = await client.rpc('approve_risk_assessment_step' as never, {
    p_assessment_id: input.assessmentId,
    p_step_order: input.stepOrder,
    p_comment: input.comment ?? null,
    p_signature: input.signature,
    p_next_assignee_id: input.nextAssigneeId ?? null,
  } as never);
  if (error) throw new Error(error.message);
}

export async function rejectStep(input: {
  assessmentId: string;
  stepOrder: number;
  rejectReason: string;
}): Promise<void> {
  const client = getCoreClient();
  const { error } = await client.rpc('reject_risk_assessment_step' as never, {
    p_assessment_id: input.assessmentId,
    p_step_order: input.stepOrder,
    p_reject_reason: input.rejectReason,
  } as never);
  if (error) throw new Error(error.message);
}

export async function reviseAssessment(input: {
  assessmentId: string;
  revisionType: 'PERIODIC' | 'OCCASIONAL';
  revisionReason: string;
}): Promise<void> {
  const client = getCoreClient();
  const { error } = await client.rpc('revise_risk_assessment' as never, {
    p_assessment_id: input.assessmentId,
    p_revision_type: input.revisionType,
    p_revision_reason: input.revisionReason,
  } as never);
  if (error) throw new Error(error.message);
}

export async function listPendingRepledges(userId: string) {
  const client = getCoreClient();
  const { data, error } = await client
    .from('risk_assessment_worker_repledges' as never)
    .select('*')
    .eq('worker_user_id', userId)
    .is('pledged_at', null);
  if (error) throw new Error(error.message);
  return data ?? [];
}

function asJson(value: Record<string, unknown>): Json {
  return value as Json;
}

export async function createDraftRiskAssessment(input: {
  organizationId: string;
  deptCode: string;
  deptName: string;
  processName: string;
  existingDocNos: readonly string[];
}): Promise<RiskAssessmentRow> {
  const client = getCoreClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error(userError?.message || '로그인이 필요합니다.');

  const docNo = generateSopDocNo(
    input.deptCode,
    getNextSequenceNumber(input.existingDocNos, input.deptCode)
  );
  const body = addStep(
    emptyDocumentBody().steps
  );
  const snapshot = buildSnapshotPayload({
    ...emptyDocumentBody(),
    steps: body,
    deptCode: input.deptCode,
    deptName: input.deptName,
    prohibitedActions: ['보호구 미착용 상태 작업 금지'],
  });

  const { data, error } = await client
    .from('risk_assessments')
    .insert({
      organization_id: input.organizationId,
      document_no: docNo,
      title: input.processName.trim(),
      process_name: input.processName.trim(),
      current_version: 1,
      status: 'DRAFT',
      created_by: userData.user.id,
      snapshot_payload: asJson(snapshot),
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as RiskAssessmentRow;
}

function mergeRejectionHistory(local: RejectionNote[], remote: RejectionNote[]): RejectionNote[] {
  const byId = new Map<string, RejectionNote>();
  for (const note of remote) byId.set(note.id, note);
  for (const note of local) if (!byId.has(note.id)) byId.set(note.id, note);
  return [...byId.values()];
}

export async function saveDraftRiskAssessment(input: {
  assessmentId: string;
  processName: string;
  body: SopDocumentBody;
}): Promise<RiskAssessmentRow> {
  const client = getCoreClient();
  const current = await client
    .from('risk_assessments')
    .select('snapshot_payload')
    .eq('id', input.assessmentId)
    .maybeSingle();
  if (current.error) throw new Error(current.error.message);
  const previous = readDocumentBody(current.data?.snapshot_payload);
  const title = input.processName.trim();
  const { data, error } = await client
    .from('risk_assessments')
    .update({
      title,
      process_name: title,
      snapshot_payload: asJson(
        buildSnapshotPayload({
          ...input.body,
          rejectionHistory: mergeRejectionHistory(input.body.rejectionHistory, previous.rejectionHistory),
        })
      ),
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.assessmentId)
    .eq('status', 'DRAFT')
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as RiskAssessmentRow;
}

export async function completeRepledge(repledgeId: string, signature: string): Promise<void> {
  const client = getCoreClient();
  const { error } = await client.rpc('complete_risk_assessment_repledge' as never, {
    p_repledge_id: repledgeId,
    p_signature: signature,
  } as never);
  if (error) throw new Error(error.message);
}
