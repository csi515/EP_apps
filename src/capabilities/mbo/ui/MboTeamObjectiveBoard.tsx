import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CalendarRange, Eye, Target, User } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import type { PersonObjectiveBucket } from '../domain/mboTeamBoardEngine';
import type { MboStatus } from '../domain/mboEngine';
import { MBO_COPY } from './mboUiCopy';

export type MboTeamBoardEmptyKind = 'no_data' | 'filtered' | 'no_access';

export type MboTeamObjectiveBoardProps = {
  buckets: PersonObjectiveBucket[];
  selectedObjectiveId?: string;
  emptyKind?: MboTeamBoardEmptyKind;
  onSelectObjective: (id: string) => void;
  onOpenDetail: (id: string) => void;
  onShowOnSchedule?: (id: string) => void;
};

function statusDot(status: MboStatus): string {
  if (status === 'completed') return 'bg-purple-500';
  if (status === 'in_progress' || status === 'approved') return 'bg-emerald-500';
  if (status === 'submitted') return 'bg-amber-500';
  if (status === 'rejected') return 'bg-rose-500';
  return 'bg-slate-400';
}

function emptyMessage(kind: MboTeamBoardEmptyKind | undefined): string {
  if (kind === 'filtered') return MBO_COPY.emptyGoalsFiltered;
  if (kind === 'no_access') return MBO_COPY.emptyGoalsNoAccess;
  return MBO_COPY.emptyGoalsNoData;
}

export const MboTeamObjectiveBoard: React.FC<MboTeamObjectiveBoardProps> = ({
  buckets,
  selectedObjectiveId,
  emptyKind,
  onSelectObjective,
  onOpenDetail,
  onShowOnSchedule,
}) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (buckets.length === 0) {
    return (
      <div data-testid="mbo-team-board-empty">
        <EmptyState title={emptyMessage(emptyKind)} />
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="mbo-team-objective-board">
      {buckets.map((bucket) => {
        const isCollapsed = collapsed[bucket.ownerKey] === true;
        return (
          <section
            key={bucket.ownerKey}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
          >
            <button
              type="button"
              className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
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
                <User className="h-4 w-4 shrink-0 text-indigo-600" />
                <span className="truncate text-sm font-extrabold text-slate-900">
                  {bucket.ownerName}
                  {bucket.isViewer ? (
                    <span className="ml-1.5 text-[10px] font-bold text-indigo-600">(나)</span>
                  ) : null}
                </span>
              </div>
              <BucketSummary count={bucket.objectiveCount} avg={bucket.averageProgress} />
            </button>

            {!isCollapsed ? (
              <ul className="border-t border-slate-100 px-2 pb-2">
                {bucket.flattened.map((obj) => {
                  const selected = selectedObjectiveId === obj.id;
                  return (
                    <li key={obj.id}>
                      <div
                        className={[
                          'flex min-h-12 w-full items-center gap-2 rounded-xl px-2 py-2',
                          selected ? 'bg-indigo-50 ring-1 ring-indigo-200' : '',
                        ].join(' ')}
                        style={{ paddingLeft: `${12 + obj.depth * 16}px` }}
                      >
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-2 text-left hover:opacity-90"
                          onClick={() => onSelectObjective(obj.id)}
                        >
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${statusDot(obj.status as MboStatus)}`}
                          />
                          <Target className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-900">
                            {obj.title}
                          </span>
                          <span className="shrink-0 text-[10px] font-semibold text-slate-500">
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

function BucketSummary({ count, avg }: { count: number; avg: number }) {
  return (
    <div className="flex shrink-0 items-center gap-2 text-[10px] font-bold text-slate-500">
      <span className="rounded-full bg-slate-100 px-2 py-0.5">{count}건</span>
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">평균 {avg}%</span>
    </div>
  );
}
