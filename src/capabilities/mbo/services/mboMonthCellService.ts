/**
 * MBO 월별 Plan/Actual 셀 서비스
 */

import { getCoreClient } from '@/lib/supabase';
import {
  planMonthCellEnsure,
  type MonthCellStatus,
} from '../domain/mboPlanActualMatrixEngine';
import type {
  MboProjectMonthCellInsert,
  MboProjectMonthCellRow,
  MboProjectMonthCellUpdate,
} from './mboServiceTypes';

/** 월별 Plan/Actual 셀 목록 */
export async function listMonthCells(
  organizationId: string,
  options: { year?: number; projectIds?: string[] } = {},
): Promise<MboProjectMonthCellRow[]> {
  const client = getCoreClient();
  let query = client
    .from('mbo_project_month_cells')
    .select('*')
    .eq('organization_id', organizationId)
    .order('year', { ascending: true })
    .order('month', { ascending: true });

  if (options.year != null) {
    query = query.eq('year', options.year);
  }
  if (options.projectIds && options.projectIds.length > 0) {
    query = query.in('project_id', options.projectIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as MboProjectMonthCellRow[]) || [];
}

/**
 * 프로젝트 일정(start~target)에 걸치는 월 칸 선생성.
 * 구간이 줄어들면 비어 있는 구간 밖 셀만 삭제.
 */
export async function ensureMonthCellsForProject(
  organizationId: string,
  projectId: string,
): Promise<void> {
  const client = getCoreClient();
  const { data: project, error: projectErr } = await client
    .from('mbo_projects')
    .select('id, start_date, target_date')
    .eq('id', projectId)
    .eq('organization_id', organizationId)
    .single();

  if (projectErr || !project) {
    throw new Error('프로젝트를 찾을 수 없습니다.');
  }

  const { data: existingRows, error: listErr } = await client
    .from('mbo_project_month_cells')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('project_id', projectId);

  if (listErr) throw listErr;

  const existing = ((existingRows as MboProjectMonthCellRow[]) || []).map((row) => ({
    id: row.id,
    year: row.year,
    month: row.month,
    planText: row.plan_text,
    planStatus: row.plan_status as MonthCellStatus,
    actualText: row.actual_text,
    actualStatus: row.actual_status as MonthCellStatus,
  }));

  const plan = planMonthCellEnsure(project.start_date, project.target_date, existing);

  if (plan.toCreate.length > 0) {
    const inserts: MboProjectMonthCellInsert[] = plan.toCreate.map((slot) => ({
      organization_id: organizationId,
      project_id: projectId,
      year: slot.year,
      month: slot.month,
      plan_text: null,
      plan_status: 'normal',
      actual_text: null,
      actual_status: 'normal',
    }));
    const { error: insertErr } = await client
      .from('mbo_project_month_cells')
      .upsert(inserts as never, {
        onConflict: 'organization_id,project_id,year,month',
        ignoreDuplicates: true,
      });
    if (insertErr) throw insertErr;
  }

  if (plan.toDeleteIds.length > 0) {
    const { error: deleteErr } = await client
      .from('mbo_project_month_cells')
      .delete()
      .eq('organization_id', organizationId)
      .in('id', plan.toDeleteIds);
    if (deleteErr) throw deleteErr;
  }
}

/** 여러 과제에 대해 월 칸 선생성 (뷰 오픈 시) */
export async function ensureMonthCellsForProjects(
  organizationId: string,
  projectIds: string[],
): Promise<void> {
  for (const projectId of projectIds) {
    await ensureMonthCellsForProject(organizationId, projectId);
  }
}

/**
 * 월 셀 필드 upsert (인라인 편집).
 * 셀이 없으면 생성 후 갱신.
 */
export async function upsertMonthCellField(
  organizationId: string,
  input: {
    projectId: string;
    year: number;
    month: number;
    field: 'plan_text' | 'actual_text' | 'plan_status' | 'actual_status';
    value: string | MonthCellStatus | null;
    updatedBy?: string | null;
  },
): Promise<MboProjectMonthCellRow> {
  const client = getCoreClient();
  const now = new Date().toISOString();
  const patch: MboProjectMonthCellUpdate = {
    [input.field]: input.value,
    updated_by: input.updatedBy ?? null,
    updated_at: now,
  };

  const { data: updated, error: updateErr } = await client
    .from('mbo_project_month_cells')
    .update(patch)
    .eq('organization_id', organizationId)
    .eq('project_id', input.projectId)
    .eq('year', input.year)
    .eq('month', input.month)
    .select()
    .maybeSingle();
  if (updateErr) throw updateErr;
  if (updated) return updated as MboProjectMonthCellRow;

  const insert: MboProjectMonthCellInsert = {
    organization_id: organizationId,
    project_id: input.projectId,
    year: input.year,
    month: input.month,
    plan_text: null,
    plan_status: 'normal',
    actual_text: null,
    actual_status: 'normal',
    updated_by: input.updatedBy ?? null,
    [input.field]: input.value,
  };

  const { data: inserted, error: insertErr } = await client
    .from('mbo_project_month_cells')
    .insert(insert)
    .select()
    .single();
  if (!insertErr) return inserted as MboProjectMonthCellRow;

  // 동시 생성 충돌 → 갱신 재시도
  if ((insertErr as { code?: string }).code === '23505') {
    const { data: retried, error: retryErr } = await client
      .from('mbo_project_month_cells')
      .update(patch)
      .eq('organization_id', organizationId)
      .eq('project_id', input.projectId)
      .eq('year', input.year)
      .eq('month', input.month)
      .select()
      .single();
    if (retryErr) throw retryErr;
    return retried as MboProjectMonthCellRow;
  }
  throw insertErr;
}
