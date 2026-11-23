import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import type { ManagerKpiModel } from '../domain/mboManagerDashboardEngine';
import { MBO_COPY } from './mboUiCopy';

type Props = {
  kpis: ManagerKpiModel;
  managerMode: boolean;
  onShowRisk?: () => void;
  onShowCheckinPending?: () => void;
};

/** 관리자용 요약 — 카드 그리드 대신 한 줄 지표 */
export function MboManagerKpiStrip({ kpis, managerMode, onShowRisk, onShowCheckinPending }: Props) {
  if (!managerMode) return null;

  const items: Array<{
    label: string;
    value: string;
    action?: (() => void) | undefined;
    actionLabel?: string;
  }> = [
    {
      label: MBO_COPY.kpiTeamAvg,
      value: `${kpis.teamAverageProgress}%`,
    },
    {
      label: MBO_COPY.kpiGoalConfirmed,
      value: kpis.mboLockRatioLabel,
    },
    {
      label: MBO_COPY.kpiDelayed,
      value: `${kpis.riskProjectCount}`,
      action: onShowRisk,
      actionLabel: kpis.riskProjectCount > 0 ? MBO_COPY.kpiViewAction : undefined,
    },
    {
      label: MBO_COPY.kpiMissingReport,
      value: `${kpis.checkinMissingMemberCount}`,
      action: onShowCheckinPending,
      actionLabel: kpis.checkinMissingMemberCount > 0 ? MBO_COPY.kpiViewAction : undefined,
    },
  ];

  return (
    <div
      className="flex flex-wrap items-stretch gap-x-4 gap-y-2 border-y border-slate-200 py-2.5"
      data-testid="mbo-manager-kpi"
      aria-label="팀 요약 · 숫자를 누르면 해당 과제만 봅니다"
    >
      {items.map((item, idx) => (
        <div
          key={item.label}
          className={[
            'flex min-w-[7.5rem] flex-1 items-baseline gap-2',
            idx > 0 ? 'sm:border-l sm:border-slate-200 sm:pl-4' : '',
          ].join(' ')}
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-500">{item.label}</p>
            <p className="text-lg font-semibold tabular-nums text-slate-900">{item.value}</p>
          </div>
          {item.action && item.actionLabel ? (
            <Button variant="ghost" size="sm" onClick={item.action}>
              {item.actionLabel}
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
