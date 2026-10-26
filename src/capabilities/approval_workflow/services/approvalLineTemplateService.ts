import { getCoreClient } from '@/lib/supabase';
import type { Json } from '@/lib/supabase/database.types';
import {
  parseSavedLineDefaultSteps,
  serializeSavedLineDefaultSteps,
  validateChosenApprovers,
  validateSavedLineTitle,
  type ApprovalAssignee,
  type SavedApprovalLineSteps,
} from '../domain/approvalLine';

function asJson(value: unknown): Json {
  return value as Json;
}

export type SavedApprovalLine = {
  id: string;
  title: string;
  category: string;
  reviewer: ApprovalAssignee;
  approver: ApprovalAssignee;
};

export async function listSavedApprovalLines(organizationId: string): Promise<SavedApprovalLine[]> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('approval_templates')
    .select('id, title, category, default_steps')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);

  const rows: SavedApprovalLine[] = [];
  for (const row of data ?? []) {
    const parsed = parseSavedLineDefaultSteps(row.default_steps);
    if (!parsed) continue;
    rows.push({
      id: row.id,
      title: row.title,
      category: row.category,
      reviewer: parsed.reviewer,
      approver: parsed.approver,
    });
  }
  return rows;
}

export async function saveApprovalLine(input: {
  organizationId: string;
  title: string;
  category?: 'general' | 'expense' | 'purchase' | 'leave' | 'work_order' | 'it_change';
  line: SavedApprovalLineSteps;
  requesterId: string;
}): Promise<SavedApprovalLine> {
  const titleCheck = validateSavedLineTitle(input.title);
  if (!titleCheck.valid) throw new Error(titleCheck.error);

  const lineCheck = validateChosenApprovers({
    requesterId: input.requesterId,
    reviewerId: input.line.reviewer.userId,
    approverId: input.line.approver.userId,
  });
  if (!lineCheck.valid) throw new Error(lineCheck.error ?? '결재선이 올바르지 않습니다.');

  const steps = serializeSavedLineDefaultSteps(input.line);
  const client = getCoreClient();
  const { data, error } = await client
    .from('approval_templates')
    .insert({
      organization_id: input.organizationId,
      title: input.title.trim(),
      category: input.category ?? 'general',
      description: '저장된 결재선',
      default_steps: asJson(steps),
      is_active: true,
    })
    .select('id, title, category, default_steps')
    .single();
  if (error) throw new Error(error.message);

  const parsed = parseSavedLineDefaultSteps(data.default_steps);
  if (!parsed) throw new Error('저장된 결재선을 읽지 못했습니다.');
  return {
    id: data.id,
    title: data.title,
    category: data.category,
    reviewer: parsed.reviewer,
    approver: parsed.approver,
  };
}

export async function deactivateApprovalLine(templateId: string): Promise<void> {
  const client = getCoreClient();
  const { error } = await client
    .from('approval_templates')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', templateId);
  if (error) throw new Error(error.message);
}
