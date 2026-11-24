import React from 'react';
import type { ManagerKpiModel } from '../domain/mboManagerDashboardEngine';
import { MBO_COPY } from './mboUiCopy';

type Props = {
  kpis: ManagerKpiModel;
  managerMode: boolean;
};

/** 관리자용 요약 — 팀 평균 진척만 표시 */
export function MboManagerKpiStrip({ kpis, managerMode }: Props) {
  if (!managerMode) return null;

  return (
    <div
      className="flex flex-wrap items-stretch gap-x-4 gap-y-2 border-y border-slate-200 py-2.5"
      data-testid="mbo-manager-kpi"
      aria-label="팀 요약"
    >
      <div className="flex min-w-[7.5rem] flex-1 items-baseline gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500">{MBO_COPY.kpiTeamAvg}</p>
          <p className="text-lg font-semibold tabular-nums text-slate-900">
            {kpis.teamAverageProgress}%
          </p>
        </div>
      </div>
    </div>
  );
}
