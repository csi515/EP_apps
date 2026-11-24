import React, { useEffect, useState } from 'react';
import { CalendarClock, ChevronDown, Lock, LockOpen } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  areGoalsLocked,
  DEFAULT_MBO_CYCLE,
  isReviewWindowOpen,
  withGoalsForceLocked,
  withGoalsUnlocked,
  type MboCycleSettings,
} from '../domain/mboCycle';
import { formatLockLabel, formatReviewLabel } from '../domain/mboCycleDisplay';
import { getMboCycleSettings, upsertMboCycleSettings } from '../services/mboCycleService';
import { MBO_COPY } from './mboUiCopy';

type Props = {
  organizationId: string | null;
  canEditCycle: boolean;
  onSettingsChange: (settings: MboCycleSettings) => void;
  isManager?: boolean;
};

export function MboCycleStatusBar({
  organizationId,
  canEditCycle,
  onSettingsChange,
  isManager = false,
}: Props) {
  const [settings, setSettings] = useState<MboCycleSettings>(DEFAULT_MBO_CYCLE);
  const [toggleBusy, setToggleBusy] = useState(false);
  const now = new Date();
  const locked = areGoalsLocked(settings, now);
  const reviewOpen = isReviewWindowOpen(settings, now);
  const canToggleLock = Boolean(organizationId) && (isManager || canEditCycle);

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

  const handleToggleLock = async () => {
    if (!organizationId || !canToggleLock || toggleBusy) return;
    setToggleBusy(true);
    try {
      const next = locked
        ? withGoalsUnlocked(settings)
        : withGoalsForceLocked(settings, new Date());
      const saved = await upsertMboCycleSettings(organizationId, next);
      setSettings(saved);
      onSettingsChange(saved);
      showToast(
        locked ? MBO_COPY.goalLockToggleUnlockedToast : MBO_COPY.goalLockToggleLockedToast,
        'success',
      );
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : MBO_COPY.goalLockToggleFailed,
        'error',
      );
    } finally {
      setToggleBusy(false);
    }
  };

  const lockSummary = locked ? MBO_COPY.lockActive : MBO_COPY.lockOff;

  return (
    <div
      className="border border-slate-200 bg-white"
      data-testid="mbo-cycle-status-bar"
    >
      <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-700">
          <CalendarClock className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <span>{formatLockLabel(settings)}</span>
          <span className={locked ? 'text-amber-800' : 'text-slate-600'}>{lockSummary}</span>
          {reviewOpen ? <span className="text-slate-600">{MBO_COPY.cycleReviewOpen}</span> : null}
        </div>
        {canToggleLock ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={locked ? 'secondary' : 'primary'}
              size="sm"
              isLoading={toggleBusy}
              onClick={() => void handleToggleLock()}
              title={MBO_COPY.goalLockToggleHint}
              data-testid="mbo-goal-lock-toggle"
            >
              {locked ? (
                <LockOpen className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Lock className="h-3.5 w-3.5" aria-hidden />
              )}
              {locked ? MBO_COPY.goalLockToggleUnlock : MBO_COPY.goalLockToggleLock}
            </Button>
          </div>
        ) : null}
      </div>

      <details className="group border-t border-slate-200">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 px-3 py-2 text-[11px] font-semibold text-slate-600 marker:content-none">
          <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" aria-hidden />
          {MBO_COPY.cyclePolicyDetails}
        </summary>
        <div className="space-y-1 px-3 pb-3 text-[11px] leading-relaxed text-slate-600">
          <p>{formatReviewLabel(settings)}</p>
          <p>{MBO_COPY.cyclePolicySummary}</p>
          <p>{MBO_COPY.goalLockToggleHint}</p>
          {isManager && locked ? <p>{MBO_COPY.cycleManagerOverride}</p> : null}
        </div>
      </details>
    </div>
  );
}
