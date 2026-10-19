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
  detectHierarchyCycle,
  calculateGradeFromScore,
  validateEvaluationPayload,
  canAccessEvaluation,
  type MboStatus,
  type MboLevel,
} from '../domain/mboEngine';
import { areGoalsLocked, isReviewWindowOpen } from '../domain/mboCycle';
import { getMboCycleSettings } from './mboCycleService';

export type MboObjectiveRow = Database['core']['Tables']['mbo_objectives']['Row'];
export type MboObjectiveInsert = Database['core']['Tables']['mbo_objectives']['Insert'];
export type MboObjectiveUpdate = Database['core']['Tables']['mbo_objectives']['Update'];

export type MboProjectRow = Database['core']['Tables']['mbo_projects']['Row'];
export type MboProjectInsert = Database['core']['Tables']['mbo_projects']['Insert'];
export type MboProjectUpdate = Database['core']['Tables']['mbo_projects']['Update'];

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
    options: { level?: MboLevel; status?: MboStatus } = {}
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
    return (data as MboObjectiveRow[]) || [];
  }

  /**
   * 목표 생성 (순환 참조 검증 포함)
   */
  static async createObjective(
    payload: MboObjectiveInsert
  ): Promise<MboObjectiveRow> {
    const client = getCoreClient();
    const cycle = await getMboCycleSettings(payload.organization_id);
    if (areGoalsLocked(cycle, new Date())) {
      throw new Error('목표 잠금 기간입니다. 새 목표를 등록할 수 없습니다.');
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
      })
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
    options: { isManager?: boolean } = {}
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
    if (goalFieldsChanging && areGoalsLocked(cycle, new Date())) {
      throw new Error('목표 잠금 기간입니다. 목표 문장과 핵심 지표는 수정할 수 없습니다.');
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
      })
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

    return this.updateObjective(id, organizationId, payload, { isManager: true });
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
      })
      .select()
      .single();

    if (error) throw error;
    return data as MboProjectRow;
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
      const transition = canTransitionMboStatus(existing.status, payload.status, {
        isManager: options.isManager,
        rejectionReason: payload.rejection_reason || undefined,
      });
      if (!transition.allowed) {
        throw new Error(transition.reason || '허용되지 않는 상태 전이입니다.');
      }
    }

    const { data, error } = await client
      .from('mbo_projects')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;
    return data as MboProjectRow;
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
   * 일자별 진행 기록 작성 및 프로젝트/상위 목표 진척률 동기화
   */
  static async recordProgressLog(
    payload: MboProgressLogInsert
  ): Promise<MboProgressLogRow> {
    const client = getCoreClient();
    const { data: log, error: logErr } = await client
      .from('mbo_progress_logs')
      .insert(payload)
      .select()
      .single();

    if (logErr) throw logErr;

    // 프로젝트의 현재 진척률 자동 갱신
    await client
      .from('mbo_projects')
      .update({
        progress_rate: payload.progress_rate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.project_id)
      .eq('organization_id', payload.organization_id);

    return log as MboProgressLogRow;
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
    isOrgAdmin: boolean
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
      })
    );
  }

  /**
   * 최종 평가 등록
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

    // 등급 자동 보정 (제공되지 않았거나 재계산 필요 시)
    const grade = payload.grade || calculateGradeFromScore(payload.score);

    const { data, error } = await client
      .from('mbo_evaluations')
      .insert({
        ...payload,
        grade,
        is_confidential: payload.is_confidential ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as MboEvaluationRow;
  }
}
