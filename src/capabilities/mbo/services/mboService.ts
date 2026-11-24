/**
 * MBO (Management by Objectives) Service
 *
 * 목표, 실행 프로젝트, 진행 일지, 피드백 코멘트, 평가 데이터에 대한
 * 비즈니스 불변식 검증 및 Supabase 상호작용 서비스.
 */

import { getCoreClient } from '@/lib/supabase';
import type { Database } from '@/lib/supabase/database.types';
import {
  canTransitionMboStatus,
  canTransitionProjectExecutionStatus,
  detectHierarchyCycle,
  calculateGradeFromScore,
  calculateWeightedObjectiveProgress,
  validateEvaluationPayload,
  canAccessEvaluation,
  type MboStatus,
  type MboLevel,
} from '../domain/mboEngine';
import { areGoalsLocked, isReviewWindowOpen } from '../domain/mboCycle';
import { formatPeriodYm, isValidPeriodYm } from '../domain/mboMonthlyCheckin';
import {
  planMonthCellEnsure,
  type MonthCellStatus,
} from '../domain/mboPlanActualMatrixEngine';
import { getMboCycleSettings } from './mboCycleService';
import type { MboRevisionChangeKind, MboVisibilityType } from '../domain/mboVisibilityEngine';
import { defaultVisibilityForLevel } from '../domain/mboGoalHierarchy';

/** database.types 반영 전 로컬 확장 (011_mbo_visibility_audit) */
export type MboObjectiveRow = Database['core']['Tables']['mbo_objectives']['Row'] & {
  visibility_type?: MboVisibilityType | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  delete_reason?: string | null;
};
export type MboObjectiveInsert = Database['core']['Tables']['mbo_objectives']['Insert'] & {
  visibility_type?: MboVisibilityType | null;
  owner_id?: string | null;
};
export type MboObjectiveUpdate = Database['core']['Tables']['mbo_objectives']['Update'] & {
  visibility_type?: MboVisibilityType | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  delete_reason?: string | null;
};

export type MboProjectRow = Database['core']['Tables']['mbo_projects']['Row'];
export type MboProjectInsert = Database['core']['Tables']['mbo_projects']['Insert'];
export type MboProjectUpdate = Database['core']['Tables']['mbo_projects']['Update'];

export type MboProjectMonthCellRow =
  Database['core']['Tables']['mbo_project_month_cells']['Row'];
export type MboProjectMonthCellInsert =
  Database['core']['Tables']['mbo_project_month_cells']['Insert'];
export type MboProjectMonthCellUpdate =
  Database['core']['Tables']['mbo_project_month_cells']['Update'];

export type MboProgressLogRow = Database['core']['Tables']['mbo_progress_logs']['Row'];
export type MboProgressLogInsert = Database['core']['Tables']['mbo_progress_logs']['Insert'];

export type MboFeedbackCommentRow = Database['core']['Tables']['mbo_feedback_comments']['Row'];
export type MboFeedbackCommentInsert = Database['core']['Tables']['mbo_feedback_comments']['Insert'];

export type MboEvaluationRow = Database['core']['Tables']['mbo_evaluations']['Row'];
export type MboEvaluationInsert = Database['core']['Tables']['mbo_evaluations']['Insert'];

export class MboService {
  /**
   * 테넌트의 목표 목록 조회
   */
  static async listObjectives(
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

  static async listObjectiveShareMemberIds(objectiveId: string): Promise<string[]> {
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

  static async listObjectiveSharesByOrg(
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
  static async createObjective(
    payload: MboObjectiveInsert,
    options: { bypassGoalCycleLock?: boolean } = {},
  ): Promise<MboObjectiveRow> {
    const client = getCoreClient();
    const cycle = await getMboCycleSettings(payload.organization_id);
    if (areGoalsLocked(cycle, new Date()) && !options.bypassGoalCycleLock) {
      throw new Error('목표 수정 마감 기간에는 새 목표를 등록할 수 없습니다.');
    }
    if (payload.parent_id) {
      const all = await this.listObjectives(payload.organization_id);
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
  static async updateObjective(
    id: string,
    organizationId: string,
    payload: MboObjectiveUpdate,
    options: { isManager?: boolean; bypassGoalCycleLock?: boolean } = {}
  ): Promise<MboObjectiveRow> {
    const client = getCoreClient();
    const all = await this.listObjectives(organizationId);
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
  static async reviewObjective(
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

    return this.updateObjective(id, organizationId, payload, {
      isManager: true,
      bypassGoalCycleLock: true,
    });
  }

  /**
   * 실행 프로젝트 목록 조회
   */
  static async listProjects(
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
  static async createProject(
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
    try {
      await this.ensureMonthCellsForProject(row.organization_id, row.id);
    } catch {
      // 슬롯 선생성 실패해도 과제 생성은 유지
    }
    return row;
  }

  /**
   * 목표에 실행 프로젝트가 없으면 기본 1건 생성
   */
  static async ensureDefaultProject(
    organizationId: string,
    objective: Pick<
      MboObjectiveRow,
      'id' | 'title' | 'owner_id' | 'owner_name' | 'start_date' | 'target_date'
    >
  ): Promise<MboProjectRow> {
    const existing = await this.listProjects(organizationId, objective.id);
    if (existing.length > 0) return existing[0]!;

    return this.createProject({
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
  static async updateProject(
    id: string,
    organizationId: string,
    payload: MboProjectUpdate,
    options: { isManager?: boolean } = {}
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
      try {
        await this.ensureMonthCellsForProject(organizationId, id);
      } catch {
        // 슬롯 동기화 실패해도 일정 저장은 유지
      }
    }
    return row;
  }

  /**
   * 실행 과제 삭제 (담당자·관리용)
   */
  static async deleteProject(id: string, organizationId: string): Promise<void> {
    const client = getCoreClient();
    const { error } = await client
      .from('mbo_projects')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw error;
  }

  /** 월별 Plan/Actual 셀 목록 */
  static async listMonthCells(
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
  static async ensureMonthCellsForProject(
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
  static async ensureMonthCellsForProjects(
    organizationId: string,
    projectIds: string[],
  ): Promise<void> {
    for (const projectId of projectIds) {
      await this.ensureMonthCellsForProject(organizationId, projectId);
    }
  }

  /**
   * 월 셀 필드 upsert (인라인 편집).
   * 셀이 없으면 생성 후 갱신.
   */
  static async upsertMonthCellField(
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

    const { data: existing, error: findErr } = await client
      .from('mbo_project_month_cells')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('project_id', input.projectId)
      .eq('year', input.year)
      .eq('month', input.month)
      .maybeSingle();

    if (findErr) throw findErr;

    if (existing) {
      const patch: MboProjectMonthCellUpdate = {
        [input.field]: input.value,
        updated_by: input.updatedBy ?? null,
        updated_at: now,
      };
      const { data, error } = await client
        .from('mbo_project_month_cells')
        .update(patch)
        .eq('id', (existing as MboProjectMonthCellRow).id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      if (error) throw error;
      return data as MboProjectMonthCellRow;
    }

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

    const { data, error } = await client
      .from('mbo_project_month_cells')
      .insert(insert)
      .select()
      .single();
    if (error) throw error;
    return data as MboProjectMonthCellRow;
  }

  /**
   * 일자별 진행 기록 목록
   */
  static async listProgressLogs(
    organizationId: string,
    projectId: string
  ): Promise<MboProgressLogRow[]> {
    const client = getCoreClient();
    const { data, error } = await client
      .from('mbo_progress_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .order('log_date', { ascending: false });

    if (error) throw error;
    return (data as MboProgressLogRow[]) || [];
  }

  /**
   * 월별 진행 기록 작성 및 프로젝트/상위 목표 진척률 동기화
   */
  static async recordProgressLog(
    payload: MboProgressLogInsert & { period_ym?: string | null }
  ): Promise<MboProgressLogRow> {
    const client = getCoreClient();
    const periodYm =
      payload.period_ym && isValidPeriodYm(payload.period_ym)
        ? payload.period_ym
        : formatPeriodYm(payload.log_date ? new Date(payload.log_date) : new Date());

    const { data: existing } = await client
      .from('mbo_progress_logs')
      .select('id')
      .eq('organization_id', payload.organization_id)
      .eq('project_id', payload.project_id)
      .eq('period_ym', periodYm)
      .maybeSingle();

    let log: MboProgressLogRow;
    if (existing?.id) {
      const { data, error } = await client
        .from('mbo_progress_logs')
        .update({
          ...payload,
          period_ym: periodYm,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      log = data as MboProgressLogRow;
    } else {
      const { data, error } = await client
        .from('mbo_progress_logs')
        .insert({
          ...payload,
          period_ym: periodYm,
        })
        .select()
        .single();
      if (error) throw error;
      log = data as MboProgressLogRow;
    }

    await client
      .from('mbo_projects')
      .update({
        progress_rate: payload.progress_rate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.project_id)
      .eq('organization_id', payload.organization_id);

    await this.rollupObjectiveProgressFromProject(
      payload.organization_id,
      payload.project_id
    );

    return log as MboProgressLogRow;
  }

  /** 프로젝트 진척 변경 후 상위 objective 가중 진척 롤업 */
  static async rollupObjectiveProgressFromProject(
    organizationId: string,
    projectId: string
  ): Promise<void> {
    const client = getCoreClient();
    const { data: project } = await client
      .from('mbo_projects')
      .select('id, objective_id, progress_rate')
      .eq('id', projectId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (!project?.objective_id) return;

    const siblings = await this.listProjects(organizationId, project.objective_id);
    const progress = calculateWeightedObjectiveProgress(
      siblings.map((p) => ({
        weight: 1,
        progressRate: p.id === projectId ? (project.progress_rate ?? 0) : (p.progress_rate ?? 0),
      }))
    );

    await client
      .from('mbo_objectives')
      .update({
        progress_rate: progress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.objective_id)
      .eq('organization_id', organizationId);
  }

  /**
   * 피드백 코멘트 목록
   */
  static async listFeedbackComments(
    organizationId: string,
    projectId: string
  ): Promise<MboFeedbackCommentRow[]> {
    const client = getCoreClient();
    const { data, error } = await client
      .from('mbo_feedback_comments')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data as MboFeedbackCommentRow[]) || [];
  }

  /**
   * 관리자 피드백 코멘트 작성
   */
  static async createFeedbackComment(
    payload: MboFeedbackCommentInsert
  ): Promise<MboFeedbackCommentRow> {
    const client = getCoreClient();
    const { data, error } = await client
      .from('mbo_feedback_comments')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as MboFeedbackCommentRow;
  }

  /**
   * 최종 평가 목록 조회 (비공개 권한 격리 적용)
   */
  static async listEvaluations(
    organizationId: string,
    projectId: string,
    currentUserId: string,
    isOrgAdmin: boolean,
    options?: {
      isSubtreeLeaderOfTarget?: (targetUserId: string | null) => boolean;
    },
  ): Promise<MboEvaluationRow[]> {
    const client = getCoreClient();
    const { data, error } = await client
      .from('mbo_evaluations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .eq('is_sample', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows = (data as MboEvaluationRow[]) || [];
    // 비공개 평가에 대한 클라이언트/서비스 레이어 필터링 방어
    return rows.filter((row) =>
      canAccessEvaluation({
        isConfidential: row.is_confidential,
        targetUserId: row.target_user_id,
        evaluatorId: row.evaluator_id,
        currentUserId,
        isOrgAdmin,
        isSubtreeLeaderOfTarget: options?.isSubtreeLeaderOfTarget?.(row.target_user_id) === true,
      })
    );
  }

  /**
   * 최종 평가 등록
   * evaluator_id 미지정 시 세션 사용자로 채움 — 기밀 RLS·canAccessEvaluation과 정합
   */
  static async createEvaluation(
    payload: MboEvaluationInsert
  ): Promise<MboEvaluationRow> {
    const client = getCoreClient();
    const validation = validateEvaluationPayload({
      score: payload.score,
      qualitativeFeedback: payload.qualitative_feedback,
      evaluationType: payload.evaluation_type || 'manager',
    });

    if (!validation.valid) {
      throw new Error(`평가 유효성 검증 실패: ${validation.errors.join(', ')}`);
    }

    const cycle = await getMboCycleSettings(payload.organization_id);
    if (!isReviewWindowOpen(cycle, new Date())) {
      throw new Error('연말 평가 기간이 아닙니다. 평가를 작성할 수 없습니다.');
    }

    let evaluatorId = payload.evaluator_id ?? null;
    if (!evaluatorId) {
      const { data: authData } = await client.auth.getUser();
      evaluatorId = authData.user?.id ?? null;
    }

    const grade = payload.grade || calculateGradeFromScore(payload.score);

    const { data, error } = await client
      .from('mbo_evaluations')
      .insert({
        ...payload,
        evaluator_id: evaluatorId,
        grade,
        is_confidential: payload.is_confidential ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as MboEvaluationRow;
  }

  /** 원자적 목표 수정 (objective 스냅샷 → mbo_objective_revisions) */
  static async reviseGoal(input: {
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

  static async listGoalRevisions(goalId: string): Promise<
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

  static async softDeleteObjective(objectiveId: string, deleteReason: string): Promise<void> {
    const client = getCoreClient();
    const { error } = await client.rpc('soft_delete_mbo_objective' as never, {
      p_objective_id: objectiveId,
      p_delete_reason: deleteReason,
    } as never);
    if (error) throw new Error(error.message);
  }

  static async replaceGoalShares(
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

  static async updateGoalVisibility(
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
      await this.replaceGoalShares(organizationId, objectiveId, sharedMemberIds);
    } else {
      await this.replaceGoalShares(organizationId, objectiveId, []);
    }
  }
}
