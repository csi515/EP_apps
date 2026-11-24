import React, { useEffect, useState } from 'react';
import { FolderKanban, Plus, User } from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui/FormField';
import { formatPeriodYm } from '../domain/mboMonthlyCheckin';
import { MBO_COPY } from './mboUiCopy';

export interface ProgressLogItem {
  id: string;
  projectId: string;
  authorName: string;
  logDate: string;
  progressRate: number;
  achievements: string;
  issuesAndActions?: string;
  nextSteps?: string;
  periodYm?: string;
}

export type MboMonthlyReviewMode = 'owner-write' | 'manager-review';

interface MboQuarterlyReviewFormProps {
  projectId: string;
  projectTitle: string;
  logs: ProgressLogItem[];
  defaultPeriodYm?: string;
  defaultProgressRate?: number;
  authorName?: string;
  mode?: MboMonthlyReviewMode;
  initialShowWrite?: boolean;
  hasNextMissing?: boolean;
  onCreateLog: (log: Omit<ProgressLogItem, 'id'>) => void | Promise<void>;
  onAfterSave?: () => void;
  onWriteNextMissing?: () => void;
}

export const MboQuarterlyReviewForm: React.FC<MboQuarterlyReviewFormProps> = ({
  projectId,
  projectTitle,
  logs,
  defaultPeriodYm,
  defaultProgressRate = 0,
  authorName = '현재 실무자',
  mode = 'owner-write',
  initialShowWrite = false,
  hasNextMissing = false,
  onCreateLog,
  onAfterSave,
  onWriteNextMissing,
}) => {
  const [showLogModal, setShowLogModal] = useState(initialShowWrite);
  const [logProgress, setLogProgress] = useState(
    Math.min(100, Math.max(0, Math.round(defaultProgressRate))),
  );
  const [logAchievements, setLogAchievements] = useState('');
  const [logIssues, setLogIssues] = useState('');
  const [logNextSteps, setLogNextSteps] = useState('');
  const [periodYm, setPeriodYm] = useState(defaultPeriodYm || formatPeriodYm());
  const [busy, setBusy] = useState(false);

  const filteredLogs = logs.filter((l) => l.projectId === projectId);
  const canWrite = mode === 'owner-write';

  useEffect(() => {
    setShowLogModal(initialShowWrite);
    setLogProgress(Math.min(100, Math.max(0, Math.round(defaultProgressRate))));
    setPeriodYm(defaultPeriodYm || formatPeriodYm());
    setLogAchievements('');
    setLogIssues('');
    setLogNextSteps('');
  }, [projectId, initialShowWrite, defaultProgressRate, defaultPeriodYm]);

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logAchievements.trim()) {
      showToast('주요 달성 성과를 입력해주세요.', 'warning');
      return;
    }
    if (!projectId || projectId.startsWith('obj-')) {
      showToast('실행 프로젝트를 먼저 선택해주세요.', 'warning');
      return;
    }

    setBusy(true);
    try {
      await onCreateLog({
        projectId,
        authorName,
        logDate: new Date().toISOString().slice(0, 10),
        progressRate: logProgress,
        achievements: logAchievements.trim(),
        issuesAndActions: logIssues.trim() || undefined,
        nextSteps: logNextSteps.trim() || undefined,
        periodYm,
      });
      setLogAchievements('');
      setLogIssues('');
      setLogNextSteps('');
      setShowLogModal(false);
      showToast(MBO_COPY.monthlyReportSaved(periodYm), 'success');
      if (hasNextMissing && onWriteNextMissing) {
        onWriteNextMissing();
      } else {
        onAfterSave?.();
      }
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : MBO_COPY.monthlyReportSaveFailed, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
            <FolderKanban className="h-3.5 w-3.5" />
            {MBO_COPY.monthlyReport}
          </p>
          <h2
            className="mt-0.5 text-base font-semibold text-slate-900"
            data-testid="mbo-monthly-project-title"
          >
            {projectTitle}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">{MBO_COPY.monthlyReportHint}</p>
        </div>
        {canWrite ? (
          <Button
            variant="primary"
            data-testid="mbo-monthly-checkin-open"
            onClick={() => setShowLogModal(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            {MBO_COPY.monthlyReportWrite}
          </Button>
        ) : null}
      </div>

      <div className="space-y-3">
        <h3 className="text-[11px] font-semibold text-slate-500">
          {MBO_COPY.monthlyReportHistory} ({filteredLogs.length}건)
        </h3>

        {filteredLogs.length === 0 ? (
          <div className="border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
            {MBO_COPY.monthlyReportMissing}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="space-y-3 border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-800">{log.authorName}</span>
                  <span className="text-[11px] text-slate-400">{log.logDate}</span>
                </div>
                <span className="text-xs font-semibold tabular-nums text-slate-800">
                  진척률 {log.progressRate}%
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <h4 className="font-semibold text-slate-700">주요 달성 성과</h4>
                  <p className="mt-0.5 leading-relaxed text-slate-600">{log.achievements}</p>
                </div>
                {log.issuesAndActions ? (
                  <div>
                    <h4 className="font-semibold text-amber-800">이슈 및 조치</h4>
                    <p className="mt-0.5 leading-relaxed text-slate-600">{log.issuesAndActions}</p>
                  </div>
                ) : null}
                {log.nextSteps ? (
                  <div>
                    <h4 className="font-semibold text-slate-700">향후 계획</h4>
                    <p className="mt-0.5 leading-relaxed text-slate-600">{log.nextSteps}</p>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        title={MBO_COPY.monthlyReportWrite}
        maxWidth="lg"
        intent="form"
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            {hasNextMissing ? (
              <p className="mr-auto self-center text-[11px] font-medium text-slate-500">
                {MBO_COPY.monthlyReportNext}
              </p>
            ) : null}
            <Button variant="ghost" onClick={() => setShowLogModal(false)}>
              취소
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="mbo-monthly-checkin-form"
              data-testid="mbo-monthly-checkin-submit"
              isLoading={busy}
            >
              {hasNextMissing ? MBO_COPY.monthlyReportNext : MBO_COPY.monthlyReportSave}
            </Button>
          </div>
        }
      >
        <form
          id="mbo-monthly-checkin-form"
          onSubmit={handleLogSubmit}
          className="space-y-3"
          data-testid="mbo-monthly-checkin-form"
        >
          <FormField label="대상 월" htmlFor="mbo-monthly-period">
            <input
              id="mbo-monthly-period"
              type="month"
              data-testid="mbo-monthly-period"
              value={periodYm}
              onChange={(e) => setPeriodYm(e.target.value)}
              className={FORM_CONTROL_CLASS}
              required
            />
          </FormField>
          <FormField label={`현재 누적 진척률 ${logProgress}%`} htmlFor="mbo-monthly-progress">
            <input
              id="mbo-monthly-progress"
              type="range"
              min={0}
              max={100}
              value={logProgress}
              onChange={(e) => setLogProgress(Number(e.target.value))}
              className="w-full accent-slate-800"
            />
          </FormField>
          <FormField label="주요 달성 성과" htmlFor="mbo-monthly-achievements" required>
            <textarea
              id="mbo-monthly-achievements"
              value={logAchievements}
              onChange={(e) => setLogAchievements(e.target.value)}
              placeholder="이번 기간 핵심 결과"
              className={`${FORM_CONTROL_CLASS} min-h-20 resize-none`}
              required
            />
          </FormField>
          <FormField label="이슈 및 장애 요인" htmlFor="mbo-monthly-issues">
            <textarea
              id="mbo-monthly-issues"
              value={logIssues}
              onChange={(e) => setLogIssues(e.target.value)}
              placeholder="지연 원인·병목 (선택)"
              className={`${FORM_CONTROL_CLASS} min-h-16 resize-none`}
            />
          </FormField>
          <FormField label="향후 조치 계획" htmlFor="mbo-monthly-next">
            <textarea
              id="mbo-monthly-next"
              value={logNextSteps}
              onChange={(e) => setLogNextSteps(e.target.value)}
              placeholder="다음 실행 과제 (선택)"
              className={`${FORM_CONTROL_CLASS} min-h-16 resize-none`}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  );
};
