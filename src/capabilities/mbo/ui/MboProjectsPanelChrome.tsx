import React from 'react';
import { SegmentedControl } from '@/shared/components/ui/SegmentedControl';
import { SearchField } from '@/shared/components/ui/SearchField';
import { MboTeamMemberChips } from './MboTeamMemberChips';
import { memberMatchesQuery } from '../domain/mboVisibilityEngine';
import type { ProjectCompletionFilter } from '../domain/projectPortfolioEngine';
import type { MboScheduleViewMode } from '../hooks/useMboManagementWorkspaceState';
import { MBO_COPY } from './mboUiCopy';
import type { TeamMemberChipModel } from '../domain/mboManagerDashboardEngine';

type Props = {
  isManager: boolean;
  scheduleViewMode: MboScheduleViewMode;
  onScheduleViewModeChange: (mode: MboScheduleViewMode) => void;
  completionFilter: ProjectCompletionFilter;
  onCompletionFilterChange: (v: ProjectCompletionFilter) => void;
  segmentActive: string;
  personQuery: string;
  onPersonQueryChange: (q: string) => void;
  teamMemberChips: TeamMemberChipModel[];
  selectedMemberUserIds: string[];
  onChangeSelectedMembers: (ids: string[]) => void;
};

/** 실행 과제 패널: 표/간트 · 완료 필터 · 팀원 칩 */
export function MboProjectsPanelChrome({
  isManager,
  scheduleViewMode,
  onScheduleViewModeChange,
  completionFilter,
  onCompletionFilterChange,
  segmentActive,
  personQuery,
  onPersonQueryChange,
  teamMemberChips,
  selectedMemberUserIds,
  onChangeSelectedMembers,
}: Props) {
  return (
    <div className="space-y-2 border border-slate-200 bg-white p-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1" data-testid="mbo-schedule-view-mode">
          <span className="text-[11px] font-semibold text-slate-500">{MBO_COPY.viewModeLabel}</span>
          <SegmentedControl
            value={scheduleViewMode}
            onChange={onScheduleViewModeChange}
            activeClassName={segmentActive}
            options={[
              { value: 'table', label: MBO_COPY.scheduleViewTable },
              { value: 'gantt', label: MBO_COPY.scheduleViewGantt },
            ]}
          />
        </div>
        <div className="flex flex-col gap-1" data-testid="mbo-project-completion-filter">
          <span className="text-[11px] font-semibold text-slate-500">
            {MBO_COPY.projectCompletionFilterLabel}
          </span>
          <SegmentedControl
            value={completionFilter}
            onChange={onCompletionFilterChange}
            activeClassName={segmentActive}
            options={[
              { value: 'active', label: MBO_COPY.projectCompletionActive },
              { value: 'completed', label: MBO_COPY.projectCompletionDone },
              { value: 'all', label: MBO_COPY.projectCompletionAll },
            ]}
          />
        </div>
        {isManager ? (
          <div className="flex min-w-[200px] flex-1 flex-col gap-1">
            <span className="text-[11px] font-semibold text-slate-500">{MBO_COPY.searchMember}</span>
            <SearchField
              value={personQuery}
              onChange={onPersonQueryChange}
              placeholder={MBO_COPY.searchMemberPlaceholder}
            />
          </div>
        ) : null}
      </div>
      {isManager ? (
        <MboTeamMemberChips
          chips={teamMemberChips.filter(
            (c) => !personQuery.trim() || memberMatchesQuery(c.displayName, personQuery),
          )}
          selectedUserIds={selectedMemberUserIds}
          onChangeSelected={onChangeSelectedMembers}
        />
      ) : null}
    </div>
  );
}
