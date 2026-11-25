/**
 * MBO (Management by Objectives) Service
 *
 * 목표, 실행 프로젝트, 진행 일지, 피드백 코멘트, 평가 데이터에 대한
 * 비즈니스 불변식 검증 및 Supabase 상호작용 서비스.
 *
 * 구현은 모듈로 분리되어 있으며, 이 파일은 기존 `MboService.*` 호출 호환 파사드입니다.
 */

export type {
  MboObjectiveRow,
  MboObjectiveInsert,
  MboObjectiveUpdate,
  MboProjectRow,
  MboProjectInsert,
  MboProjectUpdate,
  MboProjectMonthCellRow,
  MboProjectMonthCellInsert,
  MboProjectMonthCellUpdate,
  MboProgressLogRow,
  MboProgressLogInsert,
  MboFeedbackCommentRow,
  MboFeedbackCommentInsert,
  MboEvaluationRow,
  MboEvaluationInsert,
} from './mboServiceTypes';

import * as objectives from './mboObjectiveService';
import * as projects from './mboProjectService';
import * as monthCells from './mboMonthCellService';
import * as progressEval from './mboProgressEvaluationService';

export class MboService {
  static listObjectives = objectives.listObjectives;
  static listObjectiveShareMemberIds = objectives.listObjectiveShareMemberIds;
  static listObjectiveSharesByOrg = objectives.listObjectiveSharesByOrg;
  static createObjective = objectives.createObjective;
  static updateObjective = objectives.updateObjective;
  static reviewObjective = objectives.reviewObjective;
  static reviseGoal = objectives.reviseGoal;
  static listGoalRevisions = objectives.listGoalRevisions;
  static softDeleteObjective = objectives.softDeleteObjective;
  static replaceGoalShares = objectives.replaceGoalShares;
  static updateGoalVisibility = objectives.updateGoalVisibility;

  static listProjects = projects.listProjects;
  static createProject = projects.createProject;
  static ensureDefaultProject = projects.ensureDefaultProject;
  static updateProject = projects.updateProject;
  static deleteProject = projects.deleteProject;

  static listMonthCells = monthCells.listMonthCells;
  static ensureMonthCellsForProject = monthCells.ensureMonthCellsForProject;
  static ensureMonthCellsForProjects = monthCells.ensureMonthCellsForProjects;
  static upsertMonthCellField = monthCells.upsertMonthCellField;

  static listProgressLogs = progressEval.listProgressLogs;
  static recordProgressLog = progressEval.recordProgressLog;
  static rollupObjectiveProgressFromProject = progressEval.rollupObjectiveProgressFromProject;
  static listFeedbackComments = progressEval.listFeedbackComments;
  static createFeedbackComment = progressEval.createFeedbackComment;
  static listEvaluations = progressEval.listEvaluations;
  static createEvaluation = progressEval.createEvaluation;
}
