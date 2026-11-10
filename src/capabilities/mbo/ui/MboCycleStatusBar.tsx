import React, { useEffect, useState } from 'react';
import { CalendarClock, ChevronDown, Settings2 } from 'lucide-react';
import {
  areGoalsLocked,
  DEFAULT_MBO_CYCLE,
  isReviewWindowOpen,
  type MboCycleSettings,
} from '../domain/mboCycle';
import { formatLockLabel, formatReviewLabel } from '../domain/mboCycleDisplay';
import { getMboCycleSettings } from '../services/mboCycleService';
import { MboCycleSettingsModal } from './MboCycleSettingsModal';
import { MBO_COPY } from './mboUiCopy';

type Props = {
  organizationId: string | null;
  canEditCycle: boolean;
  onSettingsChange: (settings: MboCycleSettings) => void;
  isManager?: boolean;
  pendingChangeApprovals?: number;
  onOpenPendingApprovals?: () => void;
};

export function MboCycleStatusBar({
  organizationId,
  canEditCycle,
  onSettingsChange,
  isManager = false,
  pendingChangeApprovals = 0,
  onOpenPendingApprovals,
}: Props) {
  const [settings, setSettings] = useState<MboCycleSettings>(DEFAULT_MBO_CYCLE);
  const [modalOpen, setModalOpen] = useState(false);
  const now = new Date();
  const locked = areGoalsLocked(settings, now);
  const reviewOpen = isReviewWindowOpen(settings, now);

  useEffect(() => {
    if (!organizationId) {
      setSettings(DEFAULT_MBO_CYCLE);
      onSettingsChange(DEFAULT_MBO_CYCLE);
      return;
    }
    void getMboCycleSettings(organizationId)
      .then((next) => {
        setSettings(next);
        onSettingsChange(next);
      })
      .catch(() => {
        setSettings(DEFAULT_MBO_CYCLE);
        onSettingsChange(DEFAULT_MBO_CYCLE);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const handleSaved = (next: MboCycleSettings) => {
    setSettings(next);
    onSettingsChange(next);
  };

  return (
    <>
      <CycleBarStrip
        locked={locked}
        reviewOpen={reviewOpen}
        lockLabel={formatLockLabel(settings)}
        reviewLabel={formatReviewLabel(settings)}
        canEdit={canEditCycle}
        isManager={isManager}
        pendingChangeApprovals={pendingChangeApprovals}
        onOpenPendingApprovals={onOpenPendingApprovals}
        onOpenSettings={() => setModalOpen(true)}
      />
      {organizationId && modalOpen ? (
        <MboCycleSettingsModal
          open
          organizationId={organizationId}
          canEdit={canEditCycle}
          initialSettings={settings}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      ) : null}
    </>
  );
}

function CycleBarStrip({
  locked,
  reviewOpen,
  lockLabel,
  reviewLabel,
  canEdit,
  isManager,
  pendingChangeApprovals,
  onOpenPendingApprovals,
  onOpenSettings,
}: {
  locked: boolean;
  reviewOpen: boolean;
  lockLabel: string;
  reviewLabel: string;
  canEdit: boolean;
  isManager: boolean;
  pendingChangeApprovals: number;
  onOpenPendingApprovals?: () => void;
  onOpenSettings: () => void;
}) {
  const lockSummary = locked ? MBO_COPY.lockActive : MBO_COPY.lockOff;

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-3"
      data-testid="mbo-cycle-status-bar"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <CalendarClock className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
          <StatusChip tone="slate">{lockLabel}</StatusChip>
          <StatusChip tone={locked ? 'amber' : 'slate'}>{lockSummary}</StatusChip>
          {reviewOpen ? <StatusChip tone="indigo">평가 기간</StatusChip> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isManager && pendingChangeApprovals > 0 && onOpenPendingApprovals ? (
            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-xl bg-amber-50 px-3 text-xs font-bold text-amber-900"
              onClick={onOpenPendingApprovals}
            >
              변경 승인 대기 ({pendingChangeApprovals}건)
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700"
              onClick={onOpenSettings}
            >
              <Settings2 className="h-3.5 w-3.5" />
              {MBO_COPY.cycleSettingsButton}
            </button>
          ) : null}
        </div>
      </div>

      <details className="group mt-2 border-t border-slate-100 pt-2">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] font-bold text-slate-600 marker:content-none">
          <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" aria-hidden />
          주기·잠금 안내
        </summary>
        <div className="mt-2 space-y-1 text-[11px] leading-relaxed text-slate-600">
          <p>{reviewLabel}</p>
          <p>{MBO_COPY.cyclePolicySummary}</p>
          {isManager && locked ? <p>{MBO_COPY.cycleManagerOverride}</p> : null}
        </div>
      </details>
    </div>
  );
}

function StatusChip({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: 'slate' | 'amber' | 'indigo';
}) {
  const cls =
    tone === 'amber'
      ? 'bg-amber-50 text-amber-900'
      : tone === 'indigo'
        ? 'bg-indigo-50 text-indigo-800'
        : 'bg-slate-100 text-slate-700';
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}>{children}</span>
  );
}
