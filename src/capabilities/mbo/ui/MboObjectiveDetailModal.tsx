import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Send } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui/FormField';
import { Input } from '@/shared/components/ui/Input';
import type { MboStatus } from '../domain/mboEngine';
import type { MboVisibilityType } from '../domain/mboVisibilityEngine';
import type { ObjectiveNode } from './MboObjectiveTreeViewer';
import {
  goalLockStatusLabel,
  resolveMboGoalLockView,
} from '../domain/mboTwoTierLockEngine';
import { levelLabelKo } from '../domain/mboGoalHierarchy';
import { MBO_COPY } from './mboUiCopy';

export type MboObjectiveDetailModalProps = {
  objective: ObjectiveNode;
  goalsLocked: boolean;
  canOverrideGoalLock?: boolean;
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
  onSaveWeight?: (id: string, weight: number) => Promise<void> | void;
};

function statusBadge(status: MboStatus) {
  const map: Record<MboStatus, string> = {
    draft: 'bg-slate-100 text-slate-600',
    submitted: 'bg-amber-50 text-amber-700',
    approved: 'bg-blue-50 text-blue-700',
    rejected: 'bg-rose-50 text-rose-700',
    in_progress: 'bg-emerald-50 text-emerald-700',
    completed: 'bg-slate-100 text-slate-700',
    canceled: 'bg-slate-200 text-slate-500',
  };
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${map[status]}`}>
      {MBO_COPY.statusLabel[status] ?? status}
    </span>
  );
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
  onSaveWeight,
}) => {
  const lockView = resolveMboGoalLockView(objective.status, goalsLocked, canOverrideGoalLock);
  const canEditWeight =
    Boolean(onSaveWeight) && (!lockView.isStrictLocked || Boolean(lockView.managerOverrideActive));
  const [weightDraft, setWeightDraft] = useState(objective.weight);
  const [weightBusy, setWeightBusy] = useState(false);

  useEffect(() => {
    setWeightDraft(objective.weight);
  }, [objective.id, objective.weight]);

  const weightDirty = weightDraft !== objective.weight;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={objective.title}
      maxWidth="lg"
      description={`${levelLabelKo(objective.level)} · ${objective.departmentName} · ${objective.ownerName}`}
      footer={
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-col gap-2">
            {!hasLinkedProject && onCreateProject ? (
              <Button
                variant="primary"
                onClick={onCreateProject}
                data-testid="mbo-create-project-from-objective"
              >
                {MBO_COPY.ganttCreateProject}
              </Button>
            ) : null}
            {hasLinkedProject && onOpenProjects ? (
              <Button variant="secondary" onClick={onOpenProjects}>
                {MBO_COPY.openScheduleAndReport}
              </Button>
            ) : null}
            {objective.status === 'draft' ? (
              <Button variant="secondary" onClick={() => onRequestApproval(objective.id)}>
                <Send className="h-3.5 w-3.5" />
                승인 요청
              </Button>
            ) : null}
            {objective.status === 'submitted' && canApproveReject ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="success"
                  onClick={() => onApprove(objective.id)}
                  data-testid="mbo-detail-approve"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  승인
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onOpenRejectModal(objective.id)}
                  data-testid="mbo-detail-reject"
                >
                  반려
                </Button>
              </div>
            ) : null}
            {objective.status === 'submitted' && !canApproveReject ? (
              <p className="text-[11px] font-medium text-slate-600">
                {MBO_COPY.detailAwaitingApproval}
              </p>
            ) : null}
          </div>

          <div className="border-t border-slate-200 pt-2">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {MBO_COPY.detailManageActions}
            </p>
            <div className="flex flex-wrap gap-2">
              {onChangeVisibility ? (
                <select
                  className={`${FORM_CONTROL_CLASS} min-h-11 flex-1 text-[11px] font-semibold`}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRequestGoalChange(objective.id)}
                >
                  목표 변경 승인 요청
                </Button>
              ) : onOpenRevise ? (
                <Button variant="outline" size="sm" onClick={() => onOpenRevise(objective.id)}>
                  목표 수정
                </Button>
              ) : null}
              {onOpenRevisionHistory ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenRevisionHistory(objective.id)}
                >
                  이력
                </Button>
              ) : null}
              {onOpenDelete ? (
                <Button variant="destructive" size="sm" onClick={() => onOpenDelete(objective.id)}>
                  삭제
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-3 text-xs" data-testid="mbo-objective-detail-modal">
        <div className="flex flex-wrap items-center gap-2">
          {statusBadge(objective.status)}
          {!canEditWeight ? (
            <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
              {MBO_COPY.weightShort(objective.weight)}
            </span>
          ) : null}
          <span className="font-semibold text-slate-800">진척 {objective.progressRate}%</span>
          <span className="rounded bg-amber-50 px-2 py-0.5 font-semibold text-amber-900">
            {goalLockStatusLabel(lockView.lockStatus)}
          </span>
        </div>

        {canEditWeight ? (
          <div className="flex flex-wrap items-end gap-2">
            <FormField label={MBO_COPY.weightLabel} htmlFor="mbo-detail-weight" className="min-w-[8rem] flex-1">
              <Input
                id="mbo-detail-weight"
                type="number"
                min={1}
                max={100}
                value={weightDraft}
                onChange={(e) => setWeightDraft(Number(e.target.value))}
                inputSize="md"
                data-testid="mbo-detail-objective-weight"
              />
            </FormField>
            <Button
              variant="secondary"
              size="sm"
              disabled={!weightDirty || weightBusy || !Number.isFinite(weightDraft)}
              isLoading={weightBusy}
              data-testid="mbo-detail-weight-save"
              onClick={() => {
                const next = Math.min(100, Math.max(1, Math.round(weightDraft)));
                setWeightBusy(true);
                void Promise.resolve(onSaveWeight?.(objective.id, next))
                  .catch(() => undefined)
                  .finally(() => setWeightBusy(false));
              }}
            >
              비중 저장
            </Button>
          </div>
        ) : null}

        {!lockView.managerOverrideActive && lockView.isStrictLocked ? (
          <p className="text-[11px] font-semibold text-slate-600">
            지금은 목표 문구·비중을 직접 고칠 수 없습니다. 일정과 메모·진척률은 담당자가 수정할 수 있습니다.
          </p>
        ) : null}

        {objective.description ? (
          <p className="leading-relaxed text-slate-600">{objective.description}</p>
        ) : null}

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <span className="font-semibold text-slate-700">핵심 성공 기준</span>
          <p className="mt-1 text-slate-600">{objective.successCriteria}</p>
        </div>

        <p className="text-slate-500">
          기한 <span className="font-semibold text-slate-800">{objective.startDate}</span> ~{' '}
          <span className="font-semibold text-slate-800">{objective.targetDate}</span>
        </p>

        {objective.status === 'rejected' && objective.rejectionReason ? (
          <div className="flex gap-2 rounded-lg border border-rose-100 bg-rose-50 p-2.5 text-rose-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>반려 사유: {objective.rejectionReason}</span>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
