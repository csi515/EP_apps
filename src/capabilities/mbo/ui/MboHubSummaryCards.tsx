import React from 'react';
import { uiMotion } from '@/shared/components/ui/uiMotion';
import { MBO_COPY } from './mboUiCopy';

type Props = {
  hubSummary: { mineCount: number; mineAvg: number; missingMonthly: number };
};

export function MboHubSummaryCards({ hubSummary }: Props) {
  return (
    <div
      className={`flex flex-wrap gap-x-6 gap-y-2 border-y border-slate-200 py-2.5 ${uiMotion.PROGRESS_WIDTH}`}
      data-testid="mbo-hub-summary"
    >
      {[
        { label: MBO_COPY.hubMineCount, value: hubSummary.mineCount },
        { label: MBO_COPY.hubMineAvg, value: `${hubSummary.mineAvg}%` },
      ].map((item) => (
        <div key={item.label} className="min-w-[5.5rem]">
          <p className="text-[11px] font-semibold text-slate-500">{item.label}</p>
          <p className="text-lg font-semibold tabular-nums text-slate-900">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
