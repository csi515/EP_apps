import React from 'react';
import { CalendarRange, Eye } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { levelLabelKo } from '../domain/mboGoalHierarchy';
import type { OrgAlignedFlatRow } from '../domain/mboOrgAlignedTreeEngine';
import { MBO_COPY } from './mboUiCopy';
import { mboStatusDotClass } from './mboStatusVisual';

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
    const description =
      emptyKind === 'no_data' ? MBO_COPY.emptyGoalsNoDataHint : MBO_COPY.cascadeEmptyHint;
    return (
      <div className="space-y-3" data-testid="mbo-org-aligned-empty">
        <EmptyState
          title={title}
          description={description}
          action={
            emptyActionLabel && onEmptyAction
              ? (
                  <Button
                    variant="primary"
                    onClick={onEmptyAction}
                    data-testid="mbo-see-upstream"
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
    <div className="overflow-hidden border border-slate-200 bg-white" data-testid="mbo-org-aligned-board">
      <ul>
      {rows.map((obj) => {
        const selected = selectedObjectiveId === obj.id;
        return (
          <li
            key={obj.id}
            className={[
              'flex min-h-12 items-center gap-2 border-b border-slate-100 px-2 py-2 last:border-b-0',
              selected ? 'bg-slate-100' : '',
            ].join(' ')}
            style={{ paddingLeft: `${12 + obj.depth * 18}px` }}
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              onClick={() => onSelectObjective(obj.id)}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${mboStatusDotClass(obj.status)}`}
                aria-label={MBO_COPY.statusLabel[obj.status] ?? obj.status}
                title={MBO_COPY.statusLabel[obj.status] ?? obj.status}
              />
              <span className="shrink-0 text-[10px] font-medium text-slate-500">
                {levelLabelKo(obj.level)}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-900">
                {obj.title}
              </span>
              <span className="shrink-0 text-[10px] font-medium text-slate-500">
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
    </div>
  );
};
