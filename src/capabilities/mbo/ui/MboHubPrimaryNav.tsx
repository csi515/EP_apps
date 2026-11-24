import React from 'react';
import { SegmentedControl } from '@/shared/components/ui/SegmentedControl';
import { MBO_COPY } from './mboUiCopy';
import type { MboDashboardView } from '../domain/mboManagerDashboardEngine';
import type { MboListScope } from '../domain/mboVisibilityEngine';

type Props = {
  isManager: boolean;
  dashboardView: MboDashboardView;
  onDashboardViewChange: (v: MboDashboardView) => void;
  listScope: MboListScope;
  onListScopeChange: (v: MboListScope) => void;
  segmentActive: string;
};

/** 상단 고정 축: 보기 범위만 (실행 과제로 통합) */
export function MboHubPrimaryNav({
  isManager,
  dashboardView,
  onDashboardViewChange,
  listScope,
  onListScopeChange,
  segmentActive,
}: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold text-slate-500">{MBO_COPY.scopeLabel}</span>
        {isManager ? (
          <SegmentedControl
            value={dashboardView === 'mine' ? 'mine' : 'team_overview'}
            onChange={(v) => onDashboardViewChange(v)}
            activeClassName={segmentActive}
            options={[
              { value: 'team_overview', label: MBO_COPY.tabTeam },
              { value: 'mine', label: MBO_COPY.tabMine },
            ]}
          />
        ) : (
          <SegmentedControl
            value={listScope === 'visible' ? 'visible' : 'mine'}
            onChange={(v) => onListScopeChange(v)}
            activeClassName={segmentActive}
            options={[
              { value: 'visible', label: MBO_COPY.tabShared },
              { value: 'mine', label: MBO_COPY.tabMine },
            ]}
          />
        )}
      </div>
    </div>
  );
}
