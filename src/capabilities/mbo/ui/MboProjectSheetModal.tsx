import React from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import type { PortfolioProject } from '../domain/projectPortfolioEngine';
import { MboScheduleRangePicker } from './MboScheduleRangePicker';
import { MBO_COPY } from './mboUiCopy';

type Props = {
  open: boolean;
  project: PortfolioProject | null;
  goalsLocked?: boolean;
  missingMonthly?: boolean;
  onClose: () => void;
  onOpenMonthlyCheck?: () => void;
  onScheduleChange?: (range: { startDate: string; targetDate: string }) => void;
};

export function MboProjectSheetModal({
  open,
  project,
  goalsLocked,
  missingMonthly,
  onClose,
  onOpenMonthlyCheck,
  onScheduleChange,
}: Props) {
  if (!project) return null;

  const scheduleEditable = Boolean(onScheduleChange);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={project.title}
      maxWidth="lg"
      description={`${project.ownerName} · 진척 ${project.progressRate}%`}
    >
      <div className="space-y-4 text-sm">
        {missingMonthly ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            {MBO_COPY.monthlyReportMissing}
          </p>
        ) : null}

        <p className="text-slate-600">
          기간{' '}
          <span className="font-bold text-slate-900">
            {project.startDate} ~ {project.targetDate}
          </span>
        </p>

        {goalsLocked ? (
          <p className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-900">
            목표 문구는 수정 마감이어도, 일정과 진척 보고는 언제든 고칠 수 있습니다.
          </p>
        ) : null}
        {scheduleEditable ? (
          <MboScheduleRangePicker
            startDate={project.startDate}
            targetDate={project.targetDate}
            onChange={onScheduleChange!}
          />
        ) : (
          <p className="text-xs text-slate-500">일정을 변경할 수 없습니다.</p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          {onOpenMonthlyCheck ? (
            <button
              type="button"
              className="min-h-12 flex-1 rounded-xl bg-indigo-600 text-xs font-bold text-white"
              onClick={onOpenMonthlyCheck}
            >
              {MBO_COPY.monthlyReportWrite}
            </button>
          ) : null}
          <button
            type="button"
            className="min-h-12 flex-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </Modal>
  );
}
