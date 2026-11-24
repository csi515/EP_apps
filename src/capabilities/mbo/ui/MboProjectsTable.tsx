import React, { useEffect } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Pagination } from '@/shared/components/ui/Pagination';
import { useClientPagination } from '@/shared/hooks/useClientPagination';
import { toProjectExecutionStatus } from '../domain/mboEngine';
import {
  isPortfolioProjectCompleted,
  type PortfolioProject,
} from '../domain/projectPortfolioEngine';
import { MBO_COPY } from './mboUiCopy';

function projectExecutionLabel(status: PortfolioProject['status']): string {
  const exec = toProjectExecutionStatus(status);
  if (exec === 'planned') return MBO_COPY.projectStatusPlanned;
  if (exec === 'completed') return MBO_COPY.projectStatusCompleted;
  return MBO_COPY.projectStatusInProgress;
}

type Props = {
  projects: PortfolioProject[];
  viewerUserId: string;
  onOpen: (projectId: string) => void;
  onDelete?: (projectId: string) => void;
  onCreateGoal?: () => void;
  /** 필터 변경 시 페이지 리셋용 키 */
  filterKey?: string;
};

function formatRange(start: string, end: string): string {
  return `${start.slice(0, 10)} ~ ${end.slice(0, 10)}`;
}

export function MboProjectsTable({
  projects,
  viewerUserId,
  onOpen,
  onDelete,
  onCreateGoal,
  filterKey = '',
}: Props) {
  const { page, pageSize, total, pagedItems, setPage, setPageSize } = useClientPagination(
    projects,
    20,
  );

  useEffect(() => {
    setPage(1);
  }, [filterKey, setPage]);

  if (projects.length === 0) {
    return (
      <div className="space-y-3" data-testid="mbo-projects-table-empty">
        <EmptyState title={MBO_COPY.emptyGoalsNoData} description={MBO_COPY.emptyScheduleHint} />
        {onCreateGoal ? (
          <div className="flex justify-center">
            <Button variant="primary" onClick={onCreateGoal}>
              {MBO_COPY.createGoal}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="mbo-projects-table">
      <div className="overflow-x-auto border border-slate-200 bg-white">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
            <tr>
              <th className="min-w-[10rem] px-3 py-2.5">{MBO_COPY.projectTableTitle}</th>
              <th className="min-w-[5rem] px-3 py-2.5">{MBO_COPY.projectTableOwner}</th>
              <th className="min-w-[9rem] px-3 py-2.5">{MBO_COPY.projectTableBaseline}</th>
              <th className="min-w-[9rem] px-3 py-2.5">{MBO_COPY.projectTableCurrent}</th>
              <th className="min-w-[4rem] px-3 py-2.5">{MBO_COPY.projectTableProgress}</th>
              <th className="min-w-[4.5rem] px-3 py-2.5">{MBO_COPY.projectTableStatus}</th>
              <th className="min-w-[6rem] px-3 py-2.5 text-right">{MBO_COPY.projectTableActions}</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.map((p) => {
              const baselineStart = p.baselineStartDate || p.startDate;
              const baselineEnd = p.baselineTargetDate || p.targetDate;
              const changed =
                baselineStart.slice(0, 10) !== p.startDate.slice(0, 10) ||
                baselineEnd.slice(0, 10) !== p.targetDate.slice(0, 10);
              const canEdit = Boolean(p.ownerId && p.ownerId === viewerUserId);
              const completed = isPortfolioProjectCompleted(p);
              return (
                <tr
                  key={p.id}
                  className={[
                    'border-b border-slate-100 last:border-b-0',
                    completed ? 'bg-emerald-50/40' : '',
                  ].join(' ')}
                >
                  <td className="max-w-[16rem] px-3 py-2.5">
                    <button
                      type="button"
                      className="truncate text-left font-semibold text-slate-900 hover:underline"
                      onClick={() => onOpen(p.id)}
                    >
                      {p.title}
                    </button>
                    {completed ? (
                      <span className="ml-1.5 inline-flex rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        {MBO_COPY.projectCompletedBadge}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{p.ownerName}</td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-600">
                    {formatRange(baselineStart, baselineEnd)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-800">
                    {formatRange(p.startDate, p.targetDate)}
                    {changed ? (
                      <span className="ml-1 text-[10px] font-semibold text-amber-700">
                        {MBO_COPY.projectTableScheduleChanged}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums font-semibold text-slate-900">
                    {p.progressRate}%
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">
                    {projectExecutionLabel(p.status)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      {canEdit ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={MBO_COPY.projectTableEdit}
                            onClick={() => onOpen(p.id)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {onDelete ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={MBO_COPY.projectTableDelete}
                              onClick={() => onDelete(p.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={MBO_COPY.projectTableView}
                          onClick={() => onOpen(p.id)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination
        current={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
