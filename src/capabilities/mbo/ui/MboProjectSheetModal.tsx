import React, { useEffect, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { FORM_CONTROL_CLASS, FormField } from '@/shared/components/ui/FormField';
import { showToast } from '@/shared/feedback/uiFeedback';
import type { PortfolioProject } from '../domain/projectPortfolioEngine';
import { MBO_COPY } from './mboUiCopy';

const PROGRESS_STEPS = Array.from({ length: 21 }, (_, i) => i * 5);

function snapProgressToStep(value: number): number {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  return Math.round(clamped / 5) * 5;
}

type Props = {
  open: boolean;
  project: PortfolioProject | null;
  onClose: () => void;
  canEdit: boolean;
  onScheduleChange?: (range: { startDate: string; targetDate: string }) => void;
  onSaveMemoProgress?: (input: {
    ownerMemo: string;
    progressRate: number;
  }) => void | Promise<void>;
};

export function MboProjectSheetModal({
  open,
  project,
  onClose,
  canEdit,
  onScheduleChange,
  onSaveMemoProgress,
}: Props) {
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [memo, setMemo] = useState('');
  const [progressRate, setProgressRate] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!project) return;
    setStartDate(project.startDate.slice(0, 10));
    setTargetDate(project.targetDate.slice(0, 10));
    setMemo(project.ownerMemo ?? '');
    setProgressRate(snapProgressToStep(project.progressRate));
  }, [project]);

  if (!project) return null;

  const baselineStart = project.baselineStartDate || project.startDate;
  const baselineEnd = project.baselineTargetDate || project.targetDate;
  const scheduleDirty =
    startDate !== project.startDate.slice(0, 10) ||
    targetDate !== project.targetDate.slice(0, 10);
  const memoDirty =
    memo !== (project.ownerMemo ?? '') ||
    progressRate !== snapProgressToStep(project.progressRate);
  const dirty = canEdit && (scheduleDirty || memoDirty);

  const handleSave = async () => {
    if (!canEdit) return;
    if (scheduleDirty && (!startDate || !targetDate || startDate > targetDate)) {
      showToast('시작일과 종료일을 확인해 주세요.', 'warning');
      return;
    }
    setBusy(true);
    try {
      if (scheduleDirty && onScheduleChange) {
        await onScheduleChange({ startDate, targetDate });
      }
      if (memoDirty && onSaveMemoProgress) {
        await onSaveMemoProgress({
          ownerMemo: memo,
          progressRate,
        });
      } else if (!scheduleDirty && !memoDirty) {
        onClose();
        return;
      }
      showToast(MBO_COPY.projectMemoSaved, 'success');
      onClose();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : MBO_COPY.projectMemoSaveFailed,
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={project.title}
      maxWidth="2xl"
      intent="form"
      dirty={dirty}
      description={`${project.ownerName} · 진척 ${project.progressRate}%`}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          {canEdit ? (
            <Button
              variant="primary"
              isLoading={busy}
              disabled={!dirty}
              onClick={() => {
                void handleSave().catch(() => undefined);
              }}
            >
              {MBO_COPY.projectMemoSave}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-5 text-sm" data-testid="mbo-project-sheet">
        <section className="space-y-2">
          <p className="text-[11px] font-semibold text-slate-500">{MBO_COPY.projectBaselineLabel}</p>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold tabular-nums text-slate-700">
            {baselineStart.slice(0, 10)} ~ {baselineEnd.slice(0, 10)}
          </p>
          <p className="text-[11px] font-semibold text-slate-500">{MBO_COPY.projectCurrentLabel}</p>
          {canEdit && onScheduleChange ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <FormField label="시작일" htmlFor="mbo-project-start">
                <input
                  id="mbo-project-start"
                  type="date"
                  className={FORM_CONTROL_CLASS}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </FormField>
              <FormField label="종료일" htmlFor="mbo-project-end">
                <input
                  id="mbo-project-end"
                  type="date"
                  className={FORM_CONTROL_CLASS}
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </FormField>
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold tabular-nums text-slate-700">
              {project.startDate.slice(0, 10)} ~ {project.targetDate.slice(0, 10)}
              <span className="ml-2 font-medium text-slate-500">{MBO_COPY.scheduleOwnerOnly}</span>
            </p>
          )}
        </section>

        <section className="space-y-2">
          <FormField label={MBO_COPY.projectProgressLabel} htmlFor="mbo-project-progress">
            {canEdit ? (
              <select
                id="mbo-project-progress"
                className={FORM_CONTROL_CLASS}
                value={progressRate}
                onChange={(e) => setProgressRate(Number(e.target.value))}
              >
                {PROGRESS_STEPS.map((step) => (
                  <option key={step} value={step}>
                    {step}%
                  </option>
                ))}
              </select>
            ) : (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold tabular-nums text-slate-800">
                {snapProgressToStep(project.progressRate)}%
              </p>
            )}
          </FormField>
        </section>

        <section className="space-y-2">
          <FormField label={MBO_COPY.projectMemoLabel} htmlFor="mbo-project-memo">
            {canEdit ? (
              <textarea
                id="mbo-project-memo"
                className={`${FORM_CONTROL_CLASS} min-h-36 resize-y`}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder={MBO_COPY.projectMemoPlaceholder}
              />
            ) : (
              <div className="min-h-24 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {(project.ownerMemo || '').trim() || MBO_COPY.projectMemoReadonly}
              </div>
            )}
          </FormField>
          {!canEdit ? (
            <p className="text-[11px] font-medium text-slate-500">{MBO_COPY.projectMemoReadonly}</p>
          ) : null}
        </section>
      </div>
    </Modal>
  );
}
