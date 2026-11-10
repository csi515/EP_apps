import React from 'react';
import { AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
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
    <div className="flex flex-wrap gap-2" data-testid="mbo-team-member-chips">
      <button
        type="button"
        className={`min-h-11 rounded-full px-3 text-xs font-bold ${
          allSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'
        }`}
        onClick={() => onChangeSelected([])}
      >
        전체
      </button>
      {chips.map((chip) => {
        const on = allSelected || selectedUserIds.includes(chip.userId);
        return (
          <button
            key={chip.userId}
            type="button"
            title={`${chip.displayName} · 목표 ${chip.objectiveCount}건`}
            className={[
              'inline-flex min-h-11 max-w-[220px] items-center gap-2 rounded-full border px-3 text-left text-xs font-bold',
              on ? 'border-indigo-300 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-white text-slate-800',
            ].join(' ')}
            onClick={() => toggle(chip.userId)}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-extrabold text-slate-700">
              {chip.displayName.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1 truncate">{chip.displayName}</span>
            <span className="shrink-0 text-[10px] font-semibold">{chip.averageProgress}%</span>
            {chip.mboLocked ? (
              <Lock className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-label="목표 확정" />
            ) : null}
            {!chip.weightValid ? (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-label={MBO_COPY.weightChipWarn} />
            ) : null}
            {chip.checkinOk ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-label={MBO_COPY.chipReportMissing} />
            )}
          </button>
        );
      })}
    </div>
  );
}
