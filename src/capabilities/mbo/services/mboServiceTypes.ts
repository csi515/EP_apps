/**
 * MBO 서비스 Row/Insert/Update 타입
 * database.types 반영 전 로컬 확장 포함 (011_mbo_visibility_audit)
 */

import type { Database } from '@/lib/supabase/database.types';
import type { MboVisibilityType } from '../domain/mboVisibilityEngine';

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
