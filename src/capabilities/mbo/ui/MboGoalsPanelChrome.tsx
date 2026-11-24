import React from 'react';
import { SegmentedControl } from '@/shared/components/ui/SegmentedControl';
import { SearchField } from '@/shared/components/ui/SearchField';
import { MboTeamMemberChips } from './MboTeamMemberChips';
import { memberMatchesQuery } from '../domain/mboVisibilityEngine';
import { MBO_COPY } from './mboUiCopy';
import type { TeamMemberChipModel } from '../domain/mboManagerDashboardEngine';

type Props = {
  managerTeamMode: boolean;
  goalViewMode: 'person' | 'org';
  onGoalViewModeChange: (mode: 'person' | 'org') => void;
  segmentActive: string;
  personQuery: string;
  onPersonQueryChange: (q: string) => void;
  teamMemberChips: TeamMemberChipModel[];
  selectedMemberUserIds: string[];
  onChangeSelectedMembers: (ids: string[]) => void;
  showWeightHint: boolean;
  weightHint: string;
};

/** 목표 목록 패널 안에서만 보이는 정렬·멤버 필터 */
export function MboGoalsPanelChrome({
  managerTeamMode,
  goalViewMode,
  onGoalViewModeChange,
  segmentActive,
  personQuery,
  onPersonQueryChange,
  teamMemberChips,
  selectedMemberUserIds,
  onChangeSelectedMembers,
  showWeightHint,
  weightHint,
}: Props) {
  return (
    <div className="space-y-2 border border-slate-200 bg-white p-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1" data-testid="mbo-goal-view-mode">
          <span className="text-[11px] font-semibold text-slate-500">{MBO_COPY.viewModeLabel}</span>
          <SegmentedControl
            value={goalViewMode}
            onChange={onGoalViewModeChange}
            activeClassName={segmentActive}
            options={[
              { value: 'org', label: MBO_COPY.viewModeOrg },
              { value: 'person', label: MBO_COPY.viewModePerson },
            ]}
          />
        </div>
        {managerTeamMode ? (
          <div className="flex min-w-[200px] flex-1 flex-col gap-1">
            <span className="text-[11px] font-semibold text-slate-500">{MBO_COPY.searchMember}</span>
            <SearchField
              value={personQuery}
              onChange={onPersonQueryChange}
              placeholder={MBO_COPY.searchMemberPlaceholder}
            />
          </div>
        ) : null}
        {showWeightHint ? (
          <p className="text-[11px] font-medium text-amber-800">{weightHint}</p>
        ) : null}
      </div>
      {managerTeamMode ? (
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
