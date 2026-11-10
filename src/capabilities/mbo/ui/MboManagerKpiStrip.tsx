import React from 'react';
import type { ManagerKpiModel } from '../domain/mboManagerDashboardEngine';
import { MBO_COPY } from './mboUiCopy';

type Props = {
  kpis: ManagerKpiModel;
  managerMode: boolean;
  onShowRisk?: () => void;
  onShowCheckinPending?: () => void;
};

/** 관리자용 요약 — 바로 쓸 지표만 */
export function MboManagerKpiStrip({ kpis, managerMode, onShowRisk, onShowCheckinPending }: Props) {
  if (!managerMode) return null;

  const cards = [
    {
      label: MBO_COPY.kpiTeamAvg,
      value: `${kpis.teamAverageProgress}%`,
      sub: kpis.teamProgressDeltaLabel,
      action: undefined as (() => void) | undefined,
    },
    {
      label: '목표 확정',
      value: kpis.mboLockRatioLabel,
      sub:
        kpis.goalSetupIncompleteNames.length > 0
          ? `아직: ${kpis.goalSetupIncompleteNames.join(', ')}`
          : kpis.goalSetupRatioLabel,
      action: undefined as (() => void) | undefined,
    },
    {
      label: MBO_COPY.kpiDelayed,
      value: `${kpis.riskProjectCount}건`,
      sub: '마감이 지났거나 진척이 부족한 과제',
      action: onShowRisk,
    },
    {
      label: MBO_COPY.kpiMissingReport,
      value: `${kpis.checkinMissingMemberCount}명`,
      sub:
        kpis.approvalPendingCount > 0
          ? `미보고 ${kpis.checkinPendingCount}건 · ${MBO_COPY.kpiApprovalPending} ${kpis.approvalPendingCount}건`
          : `미보고 과제 ${kpis.checkinPendingCount}건`,
      action: onShowCheckinPending,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="mbo-manager-kpi">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs"
        >
          <div className="text-[11px] font-semibold text-slate-500">{card.label}</div>
          <div className="mt-1 text-xl font-black text-slate-900">{card.value}</div>
          <p className="mt-1 line-clamp-2 text-[10px] font-medium text-slate-500">{card.sub}</p>
          {card.action ? (
            <button
              type="button"
              className="mt-2 min-h-11 text-[11px] font-bold text-indigo-700"
              onClick={card.action}
            >
              해당 과제만 보기
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
