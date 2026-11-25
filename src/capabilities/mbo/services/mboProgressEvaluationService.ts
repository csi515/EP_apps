/**
 * MBO 진행 일지·피드백·평가 서비스
 */

import { getCoreClient } from '@/lib/supabase';
import {
  calculateGradeFromScore,
  calculateWeightedObjectiveProgress,
  validateEvaluationPayload,
  canAccessEvaluation,
} from '../domain/mboEngine';
import { isReviewWindowOpen } from '../domain/mboCycle';
import { formatPeriodYm, isValidPeriodYm } from '../domain/mboMonthlyCheckin';
import { getMboCycleSettings } from './mboCycleService';
import { listProjects } from './mboProjectService';
import type {
  MboEvaluationInsert,
  MboEvaluationRow,
  MboFeedbackCommentInsert,
  MboFeedbackCommentRow,
  MboProgressLogInsert,
  MboProgressLogRow,
} from './mboServiceTypes';

/**
 * 일자별 진행 기록 목록
 */
export async function listProgressLogs(
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
export async function recordProgressLog(
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

  await rollupObjectiveProgressFromProject(
    payload.organization_id,
    payload.project_id
  );

  return log as MboProgressLogRow;
}

/** 프로젝트 진척 변경 후 상위 objective 가중 진척 롤업 */
export async function rollupObjectiveProgressFromProject(
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

  const siblings = await listProjects(organizationId, project.objective_id);
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
export async function listFeedbackComments(
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
export async function createFeedbackComment(
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
export async function listEvaluations(
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
export async function createEvaluation(
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
