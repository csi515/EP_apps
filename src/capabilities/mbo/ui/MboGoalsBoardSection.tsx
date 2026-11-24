import React from 'react';
import { MboOrgAlignedBoard } from './MboOrgAlignedBoard';
import { MboTeamObjectiveBoard } from './MboTeamObjectiveBoard';
import { MBO_COPY } from './mboUiCopy';
import type { OrgAlignedFlatRow } from '../domain/mboOrgAlignedTreeEngine';
import type { PersonObjectiveBucket } from '../domain/mboTeamBoardEngine';

type Props = {
  goalViewMode: 'person' | 'org';
  orgAlignedRows: OrgAlignedFlatRow[];
  teamBoardBuckets: PersonObjectiveBucket[];
  selectedObjectiveId?: string;
  personQuery: string;
  selectedMemberUserIds: string[];
  listScope: string;
  hasUpstreamPublicGoals: boolean;
  isManager: boolean;
  onSelectObjective: (id: string) => void;
  onOpenDetail: (id: string) => void;
  onShowOnSchedule: (id: string) => void;
  onSeeUpstream: () => void;
  onCreateGoal: () => void;
};

export function MboGoalsBoardSection({
  goalViewMode,
  orgAlignedRows,
  teamBoardBuckets,
  selectedObjectiveId,
  personQuery,
  selectedMemberUserIds,
  listScope,
  hasUpstreamPublicGoals,
  isManager,
  onSelectObjective,
  onOpenDetail,
  onShowOnSchedule,
  onSeeUpstream,
  onCreateGoal,
}: Props) {
  const filtered =
    Boolean(personQuery.trim()) || selectedMemberUserIds.length > 0;
  const emptyNoAccess = !isManager && listScope === 'mine' && hasUpstreamPublicGoals;

  if (goalViewMode === 'org') {
    const empty =
      orgAlignedRows.length === 0
        ? filtered
          ? 'filtered'
          : emptyNoAccess
            ? 'no_access'
            : 'no_data'
        : undefined;
    const showCreate = empty === 'no_data';
    return (
      <MboOrgAlignedBoard
        rows={orgAlignedRows}
        selectedObjectiveId={selectedObjectiveId}
        emptyKind={empty}
        emptyActionLabel={
          empty === 'no_access'
            ? MBO_COPY.emptyGoalsSeeUpstream
            : showCreate
              ? MBO_COPY.createGoal
              : undefined
        }
        onEmptyAction={
          empty === 'no_access' ? onSeeUpstream : showCreate ? onCreateGoal : undefined
        }
        onSelectObjective={onSelectObjective}
        onShowOnSchedule={onShowOnSchedule}
        onOpenDetail={onOpenDetail}
      />
    );
  }

  const empty =
    teamBoardBuckets.length === 0
      ? filtered
        ? 'filtered'
        : emptyNoAccess
          ? 'no_access'
          : 'no_data'
      : undefined;
  const showCreate = empty === 'no_data';
  return (
    <MboTeamObjectiveBoard
      buckets={teamBoardBuckets}
      selectedObjectiveId={selectedObjectiveId}
      emptyKind={empty}
      emptyActionLabel={
        empty === 'no_access'
          ? MBO_COPY.emptyGoalsSeeUpstream
          : showCreate
            ? MBO_COPY.createGoal
            : undefined
      }
      onEmptyAction={
        empty === 'no_access' ? onSeeUpstream : showCreate ? onCreateGoal : undefined
      }
      onSelectObjective={onSelectObjective}
      onShowOnSchedule={onShowOnSchedule}
      onOpenDetail={onOpenDetail}
    />
  );
}
