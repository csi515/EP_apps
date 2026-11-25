/**
 * MBO 목표 CRUD·공유·가시성·리비전 서비스
 */

import { getCoreClient } from '@/lib/supabase';
import {
  canTransitionMboStatus,
  detectHierarchyCycle,
  type MboStatus,
  type MboLevel,
} from '../domain/mboEngine';
import { areGoalsLocked } from '../domain/mboCycle';
import { getMboCycleSettings } from './mboCycleService';
import type { MboRevisionChangeKind, MboVisibilityType } from '../domain/mboVisibilityEngine';
import { defaultVisibilityForLevel } from '../domain/mboGoalHierarchy';
import type {
  MboObjectiveInsert,
  MboObjectiveRow,
  MboObjectiveUpdate,
} from './mboServiceTypes';

/**
 * 테넌트의 목표 목록 조회
 */
export async function listObjectives(
  organizationId: string,
  options: { level?: MboLevel; status?: MboStatus; includeDeleted?: boolean } = {}
): Promise<MboObjectiveRow[]> {
  const client = getCoreClient();
  let query = client
    .from('mbo_objectives')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_sample', false)
    .order('created_at', { ascending: false });

  if (options.level) {
    query = query.eq('level', options.level);
  }
  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data as MboObjectiveRow[]) || [];
  if (options.includeDeleted) return rows;
  return rows.filter((row) => !row.deleted_at);
}

export async function listObjectiveShareMemberIds(objectiveId: string): Promise<string[]> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('mbo_objective_shares' as never)
    .select('shared_with_member_id')
    .eq('objective_id', objectiveId);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ shared_with_member_id: string }>).map(
    (row) => row.shared_with_member_id
  );
}

export async function listObjectiveSharesByOrg(
  organizationId: string
): Promise<Map<string, string[]>> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('mbo_objective_shares' as never)
    .select('objective_id, shared_with_member_id')
    .eq('organization_id', organizationId);
  if (error) throw new Error(error.message);
  const map = new Map<string, string[]>();
  for (const row of (data ?? []) as Array<{
    objective_id: string;
    shared_with_member_id: string;
  }>) {
    const list = map.get(row.objective_id) ?? [];
    list.push(row.shared_with_member_id);
    map.set(row.objective_id, list);
  }
  return map;
}

/**
 * 목표 생성 (순환 참조 검증 포함)
 */
export async function createObjective(
  payload: MboObjectiveInsert,
  options: { bypassGoalCycleLock?: boolean } = {},
): Promise<MboObjectiveRow> {
  const client = getCoreClient();
  const cycle = await getMboCycleSettings(payload.organization_id);
  if (areGoalsLocked(cycle, new Date()) && !options.bypassGoalCycleLock) {
    throw new Error('목표 수정 마감 기간에는 새 목표를 등록할 수 없습니다.');
  }
  if (payload.parent_id) {
    const all = await listObjectives(payload.organization_id);
    const isCycle = detectHierarchyCycle(
      all.map((o) => ({ id: o.id, parentId: o.parent_id })),
      'temp-new-id',
      payload.parent_id
    );
    if (isCycle) {
      throw new Error('목표 계층 간 순환 참조가 발생하여 등록할 수 없습니다.');
    }
  }

  const { data, error } = await client
    .from('mbo_objectives')
    .insert({
      ...payload,
      status: payload.status || 'draft',
      progress_rate: payload.progress_rate ?? 0,
      weight: payload.weight ?? 100,
      revision: 1,
      visibility_type:
        payload.visibility_type ||
        defaultVisibilityForLevel((payload.level as MboLevel) || 'individual'),
    } as never)
    .select()
    .single();

  if (error) throw error;
  return data as MboObjectiveRow;
}

/**
 * 목표 수정 (순환 참조 및 상태 전이 검증)
 */
export async function updateObjective(
  id: string,
  organizationId: string,
  payload: MboObjectiveUpdate,
  options: { isManager?: boolean; bypassGoalCycleLock?: boolean } = {}
): Promise<MboObjectiveRow> {
  const client = getCoreClient();
  const all = await listObjectives(organizationId);
  const existing = all.find((o) => o.id === id);
  if (!existing) {
    throw new Error('수정할 목표를 찾을 수 없습니다.');
  }

  // 부모 변경 시 순환 참조 검사
  if (payload.parent_id !== undefined && payload.parent_id !== existing.parent_id) {
    const isCycle = detectHierarchyCycle(
      all.map((o) => ({ id: o.id, parentId: o.parent_id })),
      id,
      payload.parent_id
    );
    if (isCycle) {
      throw new Error('목표 계층 간 순환 참조가 발생하여 변경할 수 없습니다.');
    }
  }

  const cycle = await getMboCycleSettings(organizationId);
  const goalFieldsChanging =
    payload.title !== undefined ||
    payload.description !== undefined ||
    payload.success_criteria !== undefined ||
    payload.weight !== undefined ||
    payload.start_date !== undefined ||
    payload.target_date !== undefined ||
    payload.parent_id !== undefined;
  if (goalFieldsChanging && areGoalsLocked(cycle, new Date()) && !options.bypassGoalCycleLock) {
    throw new Error('목표 수정 마감 기간에는 목표 문구·핵심 지표를 고칠 수 없습니다.');
  }

  // 상태 전이 검사
  if (payload.status && payload.status !== existing.status) {
    const transition = canTransitionMboStatus(existing.status, payload.status, {
      isManager: options.isManager,
      rejectionReason: payload.rejection_reason || undefined,
    });
    if (!transition.allowed) {
      throw new Error(transition.reason || '허용되지 않는 상태 전이입니다.');
    }
  }

  // 승인된 상태에서 본문 내용 변경 시 리비전 증가
  let nextRevision = existing.revision;
  if (existing.status === 'approved' && (payload.title || payload.description || payload.success_criteria)) {
    nextRevision += 1;
  }

  const { data, error } = await client
    .from('mbo_objectives')
    .update({
      ...payload,
      revision: nextRevision,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) throw error;
  return data as MboObjectiveRow;
}

/**
 * 목표 승인 / 반려 심사
 */
export async function reviewObjective(
  id: string,
  organizationId: string,
  reviewerId: string,
  action: 'approve' | 'reject',
  rejectionReason?: string
): Promise<MboObjectiveRow> {
  const nextStatus: MboStatus = action === 'approve' ? 'approved' : 'rejected';
  const payload: MboObjectiveUpdate = {
    status: nextStatus,
    approved_by: action === 'approve' ? reviewerId : null,
    approved_at: action === 'approve' ? new Date().toISOString() : null,
    rejection_reason: action === 'reject' ? rejectionReason || '관리자 반려' : null,
  };

  return updateObjective(id, organizationId, payload, {
    isManager: true,
    bypassGoalCycleLock: true,
  });
}

/** 원자적 목표 수정 (objective 스냅샷 → mbo_objective_revisions) */
export async function reviseGoal(input: {
  goalId: string;
  newTargetValue: string;
  newDueDate: string;
  unmetReason: string;
  revisionReason: string;
}): Promise<void> {
  const client = getCoreClient();
  const { error } = await client.rpc('revise_mbo_goal' as never, {
    p_objective_id: input.goalId,
    p_new_target_value: input.newTargetValue,
    p_new_due_date: input.newDueDate,
    p_unmet_reason: input.unmetReason,
    p_revision_reason: input.revisionReason,
  } as never);
  if (error) throw new Error(error.message);
}

export async function listGoalRevisions(goalId: string): Promise<
  Array<{
    id: string;
    previous_target_value: string | null;
    previous_due_date: string | null;
    previous_title: string | null;
    unmet_reason: string | null;
    revision_reason: string;
    revised_by: string;
    created_at: string;
    change_kind: MboRevisionChangeKind;
  }>
> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('mbo_objective_revisions' as never)
    .select('*')
    .eq('objective_id', goalId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    previous_target_value:
      row.previous_target_value == null ? null : String(row.previous_target_value),
    previous_due_date: (row.previous_due_date as string | null) ?? null,
    previous_title: (row.previous_title as string | null) ?? null,
    unmet_reason: (row.unmet_reason as string | null) ?? null,
    revision_reason: String(row.revision_reason ?? ''),
    revised_by: String(row.revised_by ?? ''),
    created_at: String(row.created_at ?? ''),
    change_kind: (String(row.change_kind ?? 'revise') as MboRevisionChangeKind),
  }));
}

export async function softDeleteObjective(objectiveId: string, deleteReason: string): Promise<void> {
  const client = getCoreClient();
  const { error } = await client.rpc('soft_delete_mbo_objective' as never, {
    p_objective_id: objectiveId,
    p_delete_reason: deleteReason,
  } as never);
  if (error) throw new Error(error.message);
}

export async function replaceGoalShares(
  organizationId: string,
  objectiveId: string,
  memberIds: string[]
): Promise<void> {
  const client = getCoreClient();
  const unique = [...new Set(memberIds.filter(Boolean))];
  const { error: delError } = await client
    .from('mbo_objective_shares' as never)
    .delete()
    .eq('objective_id', objectiveId)
    .eq('organization_id', organizationId);
  if (delError) throw new Error(delError.message);
  if (unique.length === 0) return;
  const { error: insError } = await client.from('mbo_objective_shares' as never).insert(
    unique.map((shared_with_member_id) => ({
      organization_id: organizationId,
      objective_id: objectiveId,
      shared_with_member_id,
    })) as never
  );
  if (insError) throw new Error(insError.message);
}

export async function updateGoalVisibility(
  organizationId: string,
  objectiveId: string,
  visibilityType: MboVisibilityType,
  sharedMemberIds: string[] = []
): Promise<void> {
  const client = getCoreClient();
  const { error } = await client
    .from('mbo_objectives')
    .update({
      visibility_type: visibilityType,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', objectiveId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null);
  if (error) throw new Error(error.message);
  if (visibilityType === 'PARTIAL') {
    await replaceGoalShares(organizationId, objectiveId, sharedMemberIds);
  } else {
    await replaceGoalShares(organizationId, objectiveId, []);
  }
}
