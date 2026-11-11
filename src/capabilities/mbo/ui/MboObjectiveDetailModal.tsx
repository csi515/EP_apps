import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Send,
  X,
} from 'lucide-react';
import type { MboStatus, MboLevel } from '../domain/mboEngine';
import type { MboVisibilityType } from '../domain/mboVisibilityEngine';
import type { ObjectiveNode } from './MboObjectiveTreeViewer';
import {
  goalLockStatusEmoji,
  goalLockStatusLabel,
  resolveMboGoalLockView,
} from '../domain/mboTwoTierLockEngine';
import { MBO_COPY } from './mboUiCopy';

export type MboObjectiveDetailModalProps = {
  objective: ObjectiveNode;
  goalsLocked: boolean;
  canOverrideGoalLock?: boolean;
  /** 승인·반려 버튼 표시 (부서장 + 해당 owner 관리 가능) */
  canApproveReject?: boolean;
  hasLinkedProject: boolean;
  onClose: () => void;
  onCreateProject?: () => void;
  onRequestApproval: (id: string) => void;
  onApprove: (id: string) => void;
  onOpenRejectModal: (id: string) => void;
  onOpenRevisionHistory?: (id: string) => void;
  onOpenRevise?: (id: string) => void;
  onOpenDelete?: (id: string) => void;
  onChangeVisibility?: (id: string, visibility: MboVisibilityType) => void;
  onOpenProjects?: () => void;
  onRequestGoalChange?: (id: string) => void;
};

function statusBadge(status: MboStatus) {
  const map: Record<MboStatus, string> = {
    draft: 'bg-slate-100 text-slate-600',
    submitted: 'bg-amber-50 text-amber-700',
    approved: 'bg-blue-50 text-blue-700',
    rejected: 'bg-rose-50 text-rose-700',
    in_progress: 'bg-emerald-50 text-emerald-700',
    completed: 'bg-purple-50 text-purple-700',
    canceled: 'bg-slate-200 text-slate-500',
  };
  const label: Record<MboStatus, string> = {
    draft: '작성 중',
    submitted: '승인 요청',
    approved: '승인 완료',
    rejected: '반려됨',
    in_progress: '실행 중',
    completed: '목표 달성',
    canceled: '취소',
  };
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${map[status]}`}>
      {label[status]}
    </span>
  );
}

function levelLabel(level: MboLevel): string {
  switch (level) {
    case 'company':
      return '전사 목표';
    case 'department':
      return '조직단위 목표';
    case 'individual':
      return '개인 KPI';
    case 'project':
      return '프로젝트';
    default:
      return level;
  }
}

export const MboObjectiveDetailModal: React.FC<MboObjectiveDetailModalProps> = ({
  objective,
  goalsLocked,
  canOverrideGoalLock = false,
  canApproveReject = false,
  hasLinkedProject,
  onClose,
  onCreateProject,
  onRequestApproval,
  onApprove,
  onOpenRejectModal,
  onOpenRevisionHistory,
  onOpenRevise,
  onOpenDelete,
  onChangeVisibility,
  onOpenProjects,
  onRequestGoalChange,
}) => {
  const lockView = resolveMboGoalLockView(objective.status, goalsLocked, canOverrideGoalLock);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      data-testid="mbo-objective-detail-modal"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-100 bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <p className="text-[11px] font-bold text-slate-500">
              {levelLabel(objective.level)} · {objective.departmentName} · {objective.ownerName}
            </p>
            <h3 className="mt-1 text-base font-extrabold text-slate-900">{objective.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-xl p-2 text-slate-400 hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {statusBadge(objective.status)}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-600">
              {MBO_COPY.weightShort(objective.weight)}
            </span>
            <span className="font-bold text-slate-800">진척 {objective.progressRate}%</span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-900">
              {goalLockStatusEmoji(lockView.lockStatus)} {goalLockStatusLabel(lockView.lockStatus)}
            </span>
          </div>
          {lockView.managerOverrideActive ? (
            <p className="rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-900">
              부서장 권한: 잠금 기간에도 이 목표(팀원 소유)를 직접 수정·승인할 수 있습니다.
            </p>
          ) : lockView.isStrictLocked ? (
            <p className="text-[11px] font-semibold text-slate-600">
              지금은 목표 문구·비중을 직접 고칠 수 없습니다. 일정과 진척 보고는 언제든 수정할 수 있습니다.
            </p>
          ) : null}

          {objective.description ? (
            <p className="leading-relaxed text-slate-600">{objective.description}</p>
          ) : null}

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <span className="font-bold text-slate-700">핵심 성공 기준</span>
            <p className="mt-1 text-slate-600">{objective.successCriteria}</p>
          </div>

          <p className="text-slate-500">
            기한 <span className="font-semibold text-slate-800">{objective.startDate}</span> ~{' '}
            <span className="font-semibold text-slate-800">{objective.targetDate}</span>
          </p>

          {objective.status === 'rejected' && objective.rejectionReason ? (
            <div className="flex gap-2 rounded-xl border border-rose-100 bg-rose-50 p-2.5 text-rose-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>반려 사유: {objective.rejectionReason}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          {!hasLinkedProject && onCreateProject ? (
            <button
              type="button"
              className="min-h-12 w-full rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700"
              onClick={onCreateProject}
              data-testid="mbo-create-project-from-objective"
            >
              실행 프로젝트 만들기
            </button>
          ) : null}
          {hasLinkedProject && onOpenProjects ? (
            <button
              type="button"
              className="min-h-12 w-full rounded-xl border border-indigo-200 bg-indigo-50 text-xs font-bold text-indigo-800"
              onClick={onOpenProjects}
            >
              {MBO_COPY.openScheduleAndReport}
            </button>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {onChangeVisibility ? (
              <select
                className="min-h-12 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-700"
                value={objective.visibilityType || 'PRIVATE'}
                aria-label="공개범위"
                onChange={(e) =>
                  onChangeVisibility(objective.id, e.target.value as MboVisibilityType)
                }
              >
                <option value="PRIVATE">비공개</option>
                <option value="PUBLIC">전체 공개</option>
                <option value="PARTIAL">선택 공개</option>
              </select>
            ) : null}
            {lockView.isStrictLocked && onRequestGoalChange ? (
              <button
                type="button"
                onClick={() => onRequestGoalChange(objective.id)}
                className="min-h-12 rounded-lg bg-amber-50 px-3 text-[11px] font-bold text-amber-800"
              >
                목표 변경 승인 요청
              </button>
            ) : onOpenRevise ? (
              <button
                type="button"
                onClick={() => onOpenRevise(objective.id)}
                className="min-h-12 rounded-lg bg-amber-50 px-3 text-[11px] font-bold text-amber-800"
              >
                목표 수정
              </button>
            ) : null}
            {onOpenRevisionHistory ? (
              <button
                type="button"
                onClick={() => onOpenRevisionHistory(objective.id)}
                className="min-h-12 rounded-lg bg-slate-100 px-3 text-[11px] font-bold text-slate-700"
              >
                이력
              </button>
            ) : null}
            {onOpenDelete ? (
              <button
                type="button"
                onClick={() => onOpenDelete(objective.id)}
                className="min-h-12 rounded-lg bg-rose-50 px-3 text-[11px] font-bold text-rose-700"
              >
                삭제
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {objective.status === 'draft' ? (
              <button
                type="button"
                onClick={() => onRequestApproval(objective.id)}
                className="inline-flex min-h-12 items-center gap-1 rounded-lg bg-blue-50 px-3 text-[11px] font-bold text-blue-700"
              >
                <Send className="h-3 w-3" />
                승인 요청
              </button>
            ) : null}
            {objective.status === 'submitted' && canApproveReject ? (
              <>
                <button
                  type="button"
                  onClick={() => onApprove(objective.id)}
                  className="inline-flex min-h-12 items-center gap-1 rounded-lg bg-emerald-50 px-3 text-[11px] font-bold text-emerald-700"
                  data-testid="mbo-detail-approve"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  승인
                </button>
                <button
                  type="button"
                  onClick={() => onOpenRejectModal(objective.id)}
                  className="min-h-12 rounded-lg bg-rose-50 px-3 text-[11px] font-bold text-rose-700"
                  data-testid="mbo-detail-reject"
                >
                  반려
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
