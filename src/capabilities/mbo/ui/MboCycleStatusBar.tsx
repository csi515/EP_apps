import React, { useEffect, useState } from 'react';
import { CalendarClock, ChevronDown, Settings2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
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
      className="border border-slate-200 bg-white"
      data-testid="mbo-cycle-status-bar"
    >
      <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-700">
          <CalendarClock className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <span>{lockLabel}</span>
          <span className={locked ? 'text-amber-800' : 'text-slate-600'}>{lockSummary}</span>
          {reviewOpen ? <span className="text-slate-600">{MBO_COPY.cycleReviewOpen}</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isManager && onOpenPendingApprovals ? (
            <Button variant="outline" size="sm" onClick={onOpenPendingApprovals}>
              {pendingChangeApprovals > 0
                ? MBO_COPY.pendingApprovalsCount(pendingChangeApprovals)
                : MBO_COPY.pendingApprovalsZero}
            </Button>
          ) : null}
          {canEdit ? (
            <Button variant="outline" size="sm" onClick={onOpenSettings}>
              <Settings2 className="h-3.5 w-3.5" />
              {MBO_COPY.cycleSettingsButton}
            </Button>
          ) : null}
        </div>
      </div>

      <details className="group border-t border-slate-200">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 px-3 py-2 text-[11px] font-semibold text-slate-600 marker:content-none">
          <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" aria-hidden />
          {MBO_COPY.cyclePolicyDetails}
        </summary>
        <div className="space-y-1 px-3 pb-3 text-[11px] leading-relaxed text-slate-600">
          <p>{reviewLabel}</p>
          <p>{MBO_COPY.cyclePolicySummary}</p>
          {isManager && locked ? <p>{MBO_COPY.cycleManagerOverride}</p> : null}
        </div>
      </details>
    </div>
  );
}
