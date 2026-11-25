/**
 * MBO 실행 프로젝트 서비스
 */

import { getCoreClient } from '@/lib/supabase';
import {
  canTransitionProjectExecutionStatus,
  type MboStatus,
} from '../domain/mboEngine';
import { ensureMonthCellsForProject } from './mboMonthCellService';
import type {
  MboObjectiveRow,
  MboProjectInsert,
  MboProjectRow,
  MboProjectUpdate,
} from './mboServiceTypes';

/**
 * 실행 프로젝트 목록 조회
 */
export async function listProjects(
  organizationId: string,
  objectiveId?: string
): Promise<MboProjectRow[]> {
  const client = getCoreClient();
  let query = client
    .from('mbo_projects')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (objectiveId) {
    query = query.eq('objective_id', objectiveId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as MboProjectRow[]) || [];
}

/**
 * 실행 프로젝트 생성
 */
export async function createProject(
  payload: MboProjectInsert
): Promise<MboProjectRow> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('mbo_projects')
    .insert({
      ...payload,
      status: payload.status || 'draft',
      progress_rate: payload.progress_rate ?? 0,
      revision: 1,
      baseline_start_date: payload.baseline_start_date ?? payload.start_date,
      baseline_target_date: payload.baseline_target_date ?? payload.target_date,
    })
    .select()
    .single();

  if (error) throw error;
  const row = data as MboProjectRow;
  await ensureMonthCellsForProject(row.organization_id, row.id);
  return row;
}

/**
 * 목표에 실행 프로젝트가 없으면 기본 1건 생성
 */
export async function ensureDefaultProject(
  organizationId: string,
  objective: Pick<
    MboObjectiveRow,
    'id' | 'title' | 'owner_id' | 'owner_name' | 'start_date' | 'target_date'
  >
): Promise<MboProjectRow> {
  const existing = await listProjects(organizationId, objective.id);
  if (existing.length > 0) return existing[0]!;

  return createProject({
    organization_id: organizationId,
    objective_id: objective.id,
    title: objective.title,
    owner_id: objective.owner_id,
    owner_name: objective.owner_name,
    start_date: objective.start_date,
    target_date: objective.target_date,
    baseline_start_date: objective.start_date,
    baseline_target_date: objective.target_date,
    status: 'in_progress',
    progress_rate: 0,
  });
}

/**
 * 실행 프로젝트 수정
 */
export async function updateProject(
  id: string,
  organizationId: string,
  payload: MboProjectUpdate,
  _options: { isManager?: boolean } = {}
): Promise<MboProjectRow> {
  const client = getCoreClient();
  const { data: existing, error: findErr } = await client
    .from('mbo_projects')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single();

  if (findErr || !existing) {
    throw new Error('프로젝트를 찾을 수 없습니다.');
  }

  if (payload.status && payload.status !== existing.status) {
    const transition = canTransitionProjectExecutionStatus(
      existing.status as MboStatus,
      payload.status as MboStatus,
    );
    if (!transition.allowed) {
      throw new Error(transition.reason || '허용되지 않는 상태 전이입니다.');
    }
  }

  // 최초 일정(baseline)은 생성 후 불변 — 클라이언트가 실수로 덮어쓰지 않도록 제거
  const {
    baseline_start_date: _bStart,
    baseline_target_date: _bTarget,
    ...safePayload
  } = payload as MboProjectUpdate & {
    baseline_start_date?: string;
    baseline_target_date?: string;
  };

  const { data, error } = await client
    .from('mbo_projects')
    .update({
      ...safePayload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) throw error;
  const row = data as MboProjectRow;
  if (row.start_date !== existing.start_date || row.target_date !== existing.target_date) {
    await ensureMonthCellsForProject(organizationId, id);
  }
  return row;
}

/**
 * 실행 과제 삭제 (담당자·관리용)
 */
export async function deleteProject(id: string, organizationId: string): Promise<void> {
  const client = getCoreClient();
  const { error } = await client
    .from('mbo_projects')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId);

  if (error) throw error;
}
