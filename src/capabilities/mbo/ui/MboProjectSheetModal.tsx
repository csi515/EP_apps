import React from 'react';
import { Button } from '@/shared/components/ui/Button';
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
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          {onOpenMonthlyCheck ? (
            <Button
              variant="primary"
              className="flex-1"
              onClick={onOpenMonthlyCheck}
              data-testid="mbo-project-sheet-monthly-open"
            >
              {MBO_COPY.monthlyReportWrite}
            </Button>
          ) : null}
          <Button variant="outline" className="flex-1" onClick={onClose}>
            닫기
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm" data-testid="mbo-project-sheet">
        {missingMonthly ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            {MBO_COPY.monthlyReportMissing}
          </p>
        ) : null}

        <p className="text-slate-600">
          기간{' '}
          <span className="font-semibold text-slate-900">
            {project.startDate} ~ {project.targetDate}
          </span>
        </p>

        {goalsLocked ? (
          <p className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-800">
            {MBO_COPY.scheduleAlwaysEditable}
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
      </div>
    </Modal>
  );
}
