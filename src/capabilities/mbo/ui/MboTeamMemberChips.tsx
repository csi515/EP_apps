import React from 'react';
import { AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import type { TeamMemberChipModel } from '../domain/mboManagerDashboardEngine';
import { MBO_COPY } from './mboUiCopy';

type Props = {
  chips: TeamMemberChipModel[];
  selectedUserIds: string[];
  onChangeSelected: (userIds: string[]) => void;
};

export function MboTeamMemberChips({ chips, selectedUserIds, onChangeSelected }: Props) {
  const allSelected = selectedUserIds.length === 0;

  const toggle = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onChangeSelected(selectedUserIds.filter((id) => id !== userId));
      return;
    }
    onChangeSelected([...selectedUserIds, userId]);
  };

  return (
    <div className="space-y-1.5" data-testid="mbo-team-member-chips">
      <p className="text-[11px] font-medium text-slate-500">
        {allSelected
          ? MBO_COPY.memberFilterHint
          : MBO_COPY.memberFilterSelected(selectedUserIds.length)}
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Button
          variant="outline"
          size="sm"
          className={`shrink-0 ${
            allSelected
              ? 'border-slate-800 bg-slate-800 text-white hover:bg-slate-900 hover:text-white'
              : ''
          }`}
          onClick={() => onChangeSelected([])}
        >
          {MBO_COPY.memberFilterAll}
        </Button>
        {chips.map((chip) => {
          const on = allSelected || selectedUserIds.includes(chip.userId);
          return (
            <button
              key={chip.userId}
              type="button"
              title={`${chip.displayName} · 목표 ${chip.objectiveCount}건`}
              className={[
                'inline-flex min-h-11 max-w-[200px] shrink-0 items-center gap-2 rounded-md border px-2.5 text-left text-xs font-semibold',
                on
                  ? 'border-slate-400 bg-slate-100 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-700',
              ].join(' ')}
              onClick={() => toggle(chip.userId)}
            >
              <span className="min-w-0 flex-1 truncate">{chip.displayName}</span>
              <span className="shrink-0 tabular-nums text-[10px] font-medium text-slate-500">
                {chip.averageProgress}%
              </span>
              {chip.mboLocked ? (
                <Lock className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-label="목표 확정" />
              ) : null}
              {!chip.weightValid ? (
                <AlertTriangle
                  className="h-3.5 w-3.5 shrink-0 text-amber-600"
                  aria-label={MBO_COPY.weightChipWarn}
                />
              ) : null}
              {chip.checkinOk ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-rose-500"
                  aria-label={MBO_COPY.chipReportMissing}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
