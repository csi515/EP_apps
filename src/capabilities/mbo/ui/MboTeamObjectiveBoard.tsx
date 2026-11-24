import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CalendarRange, Eye, User } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import type { PersonObjectiveBucket } from '../domain/mboTeamBoardEngine';
import type { MboLevel, MboStatus } from '../domain/mboEngine';
import { levelLabelKo } from '../domain/mboGoalHierarchy';
import { MBO_COPY } from './mboUiCopy';
import { mboStatusDotClass } from './mboStatusVisual';

export type MboTeamBoardEmptyKind = 'no_data' | 'filtered' | 'no_access';

export type MboTeamObjectiveBoardProps = {
  buckets: PersonObjectiveBucket[];
  selectedObjectiveId?: string;
  emptyKind?: MboTeamBoardEmptyKind;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onSelectObjective: (id: string) => void;
  onOpenDetail: (id: string) => void;
  onShowOnSchedule?: (id: string) => void;
};

function emptyMessage(kind: MboTeamBoardEmptyKind | undefined): string {
  if (kind === 'filtered') return MBO_COPY.emptyGoalsFiltered;
  if (kind === 'no_access') return MBO_COPY.emptyGoalsNoAccess;
  return MBO_COPY.emptyGoalsNoData;
}

export const MboTeamObjectiveBoard: React.FC<MboTeamObjectiveBoardProps> = ({
  buckets,
  selectedObjectiveId,
  emptyKind,
  emptyActionLabel,
  onEmptyAction,
  onSelectObjective,
  onOpenDetail,
  onShowOnSchedule,
}) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (buckets.length === 0) {
    const description =
      emptyKind === 'no_data' ? MBO_COPY.emptyGoalsNoDataHint : MBO_COPY.cascadeEmptyHint;
    return (
      <div className="space-y-3" data-testid="mbo-team-board-empty">
        <EmptyState
          title={emptyMessage(emptyKind)}
          description={description}
          action={
            emptyActionLabel && onEmptyAction
              ? (
                  <Button
                    variant="primary"
                    onClick={onEmptyAction}
                    data-testid="mbo-see-upstream-person"
                  >
                    {emptyActionLabel}
                  </Button>
                )
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden border border-slate-200 bg-white"
      data-testid="mbo-team-objective-board"
    >
      {buckets.map((bucket) => {
        const isCollapsed = collapsed[bucket.ownerKey] === true;
        return (
          <section key={bucket.ownerKey} className="border-b border-slate-200 last:border-b-0">
            <button
              type="button"
              className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 text-left hover:bg-slate-50"
              onClick={() =>
                setCollapsed((prev) => ({
                  ...prev,
                  [bucket.ownerKey]: !isCollapsed,
                }))
              }
            >
              <div className="flex min-w-0 items-center gap-2">
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                )}
                <User className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="truncate text-sm font-semibold text-slate-900">
                  {bucket.ownerName}
                  {bucket.isViewer ? (
                    <span className="ml-1.5 text-[10px] font-semibold text-slate-500">(나)</span>
                  ) : null}
                </span>
              </div>
              <span className="shrink-0 text-[11px] font-medium text-slate-500">
                {MBO_COPY.boardBucketSummary(bucket.objectiveCount, bucket.averageProgress)}
              </span>
            </button>

            {!isCollapsed ? (
              <ul className="px-1 pb-1">
                {bucket.flattened.map((obj) => {
                  const selected = selectedObjectiveId === obj.id;
                  return (
                    <li key={obj.id}>
                      <div
                        className={[
                          'flex min-h-12 w-full items-center gap-2 px-2 py-2',
                          selected ? 'bg-slate-100' : '',
                        ].join(' ')}
                        style={{ paddingLeft: `${12 + obj.depth * 16}px` }}
                      >
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          onClick={() => onSelectObjective(obj.id)}
                        >
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${mboStatusDotClass(obj.status as MboStatus)}`}
                            aria-label={MBO_COPY.statusLabel[obj.status] ?? obj.status}
                            title={MBO_COPY.statusLabel[obj.status] ?? obj.status}
                          />
                          <span className="shrink-0 text-[10px] font-medium text-slate-500">
                            {levelLabelKo(obj.level as MboLevel)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-900">
                            {obj.title}
                          </span>
                          <span className="shrink-0 text-[10px] font-medium text-slate-500">
                            {obj.progressRate}%
                          </span>
                        </button>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-md"
                            aria-label={MBO_COPY.openDetail}
                            title={MBO_COPY.openDetail}
                            onClick={() => onOpenDetail(obj.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {onShowOnSchedule ? (
                            <Button
                              variant="ghost"
                              size="icon-md"
                              aria-label={MBO_COPY.showOnSchedule}
                              title={MBO_COPY.showOnSchedule}
                              onClick={() => onShowOnSchedule(obj.id)}
                            >
                              <CalendarRange className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
};
