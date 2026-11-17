import React from 'react';
import { CalendarRange, Eye, Target } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { levelLabelKo } from '../domain/mboGoalHierarchy';
import type { OrgAlignedFlatRow } from '../domain/mboOrgAlignedTreeEngine';
import type { MboStatus } from '../domain/mboEngine';
import { MBO_COPY } from './mboUiCopy';

type Props = {
  rows: OrgAlignedFlatRow[];
  selectedObjectiveId?: string;
  emptyKind?: 'no_data' | 'filtered' | 'no_access';
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onSelectObjective: (id: string) => void;
  onOpenDetail: (id: string) => void;
  onShowOnSchedule?: (id: string) => void;
};

function statusDot(status: string): string {
  if (status === 'completed') return 'bg-purple-500';
  if (status === 'in_progress' || status === 'approved') return 'bg-emerald-500';
  if (status === 'submitted') return 'bg-amber-500';
  if (status === 'rejected') return 'bg-rose-500';
  return 'bg-slate-400';
}

export const MboOrgAlignedBoard: React.FC<Props> = ({
  rows,
  selectedObjectiveId,
  emptyKind,
  emptyActionLabel,
  onEmptyAction,
  onSelectObjective,
  onOpenDetail,
  onShowOnSchedule,
}) => {
  if (rows.length === 0) {
    const title =
      emptyKind === 'filtered'
        ? MBO_COPY.emptyGoalsFiltered
        : emptyKind === 'no_access'
          ? MBO_COPY.emptyGoalsNoAccess
          : MBO_COPY.emptyGoalsNoData;
    return (
      <div className="space-y-3" data-testid="mbo-org-aligned-empty">
        <EmptyState title={title} description={MBO_COPY.cascadeEmptyHint} />
        {emptyActionLabel && onEmptyAction ? (
          <div className="flex justify-center">
            <Button variant="secondary" onClick={onEmptyAction} data-testid="mbo-see-upstream">
              {emptyActionLabel}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <ul
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
      data-testid="mbo-org-aligned-board"
    >
      {rows.map((obj) => {
        const selected = selectedObjectiveId === obj.id;
        return (
          <li
            key={obj.id}
            className={[
              'flex min-h-12 items-center gap-2 border-b border-slate-100 px-2 py-2 last:border-b-0',
              selected ? 'bg-indigo-50' : '',
            ].join(' ')}
            style={{ paddingLeft: `${12 + obj.depth * 18}px` }}
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              onClick={() => onSelectObjective(obj.id)}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${statusDot(obj.status as MboStatus)}`}
                aria-label={MBO_COPY.statusLabel[obj.status] ?? obj.status}
                title={MBO_COPY.statusLabel[obj.status] ?? obj.status}
              />
              <Target className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="shrink-0 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">
                {levelLabelKo(obj.level)}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-900">
                {obj.title}
              </span>
              <span className="shrink-0 text-[10px] font-semibold text-slate-500">
                {obj.ownerName} · {obj.progressRate}%
              </span>
            </button>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon-md"
                aria-label={MBO_COPY.openDetail}
                onClick={() => onOpenDetail(obj.id)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              {onShowOnSchedule ? (
                <Button
                  variant="ghost"
                  size="icon-md"
                  aria-label={MBO_COPY.showOnSchedule}
                  onClick={() => onShowOnSchedule(obj.id)}
                >
                  <CalendarRange className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
