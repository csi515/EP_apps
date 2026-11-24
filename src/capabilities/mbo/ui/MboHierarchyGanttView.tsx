import React, { useMemo, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { FORM_CONTROL_CLASS } from '@/shared/components/ui/FormField';
import type { HierarchyGanttRow } from '../domain/mboGanttHierarchyEngine';
import { buildMboFrappeGanttTasks } from '../domain/mboFrappeGanttTasks';
import {
  currentMonthVisibleRange,
  currentYearVisibleRange,
  datesOverlapRange,
  normalizeVisibleRange,
  type MboGanttVisibleRange,
} from '../domain/mboGanttVisibleRange';
import { MBO_COPY } from './mboUiCopy';
import type { PortfolioProject } from '../domain/projectPortfolioEngine';
import type { ProjectCategory } from '../domain/projectCategoryEngine';
import { MboFrappeGanttChart } from './MboFrappeGanttChart';

export type MboHierarchyGanttViewProps = {
  rows: HierarchyGanttRow[];
  projects: PortfolioProject[];
  categories?: ProjectCategory[];
  organizationId?: string | null;
  selectedProjectId?: string | null;
  scheduleEditable?: boolean;
  editableProjectIds?: ReadonlySet<string>;
  goalsLocked?: boolean;
  onSelectProject?: (projectId: string) => void;
  onOpenProjectSheet?: (projectId: string) => void;
  onScheduleChange?: (
    projectId: string,
    range: { startDate: string; targetDate: string },
  ) => Promise<void> | void;
  onCategoriesChanged?: () => void;
  onCreateProject?: () => void;
  onOpenCreateObjective?: () => void;
  onOpenObjectiveDetail?: (objectiveId: string) => void;
  onClearFilters?: () => void;
};

export function MboHierarchyGanttView({
  rows,
  scheduleEditable = true,
  editableProjectIds,
  onSelectProject,
  onOpenProjectSheet,
  onScheduleChange,
  onCreateProject,
  onOpenCreateObjective,
  onOpenObjectiveDetail,
  onClearFilters,
}: MboHierarchyGanttViewProps) {
  const [visibleRange, setVisibleRange] = useState<MboGanttVisibleRange>(() =>
    currentYearVisibleRange(),
  );

  const normalizedRange = useMemo(
    () => normalizeVisibleRange(visibleRange),
    [visibleRange],
  );

  const filteredRows = useMemo(
    () =>
      rows.filter((row) =>
        datesOverlapRange(
          row.startDate,
          row.targetDate,
          normalizedRange.startDate,
          normalizedRange.endDate,
        ),
      ),
    [rows, normalizedRange],
  );

  const tasks = useMemo(
    () => buildMboFrappeGanttTasks(filteredRows, normalizedRange),
    [filteredRows, normalizedRange],
  );

  const openProject = (projectId: string) => {
    onSelectProject?.(projectId);
    onOpenProjectSheet?.(projectId);
  };

  if (rows.length === 0) {
    return (
      <div className="space-y-3" data-testid="mbo-hierarchy-gantt-empty">
        <EmptyState title={MBO_COPY.emptyGoalsNoData} description={MBO_COPY.emptyScheduleHint} />
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          {onOpenCreateObjective ? (
            <Button variant="primary" onClick={onOpenCreateObjective}>
              {MBO_COPY.ganttCreateObjective}
            </Button>
          ) : null}
          {onCreateProject ? (
            <Button variant="secondary" onClick={onCreateProject}>
              {MBO_COPY.ganttCreateProject}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="mbo-hierarchy-gantt">
      <div className="flex flex-wrap items-center gap-2">
        <fieldset className="flex flex-wrap items-center gap-2 border-0 p-0">
          <legend className="sr-only">{MBO_COPY.ganttRangeLabel}</legend>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            {MBO_COPY.ganttRangeStart}
            <input
              type="date"
              className={`${FORM_CONTROL_CLASS} w-auto min-w-[9.5rem]`}
              value={normalizedRange.startDate}
              onChange={(e) =>
                setVisibleRange((prev) =>
                  normalizeVisibleRange({
                    startDate: e.target.value,
                    endDate: prev.endDate,
                  }),
                )
              }
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            {MBO_COPY.ganttRangeEnd}
            <input
              type="date"
              className={`${FORM_CONTROL_CLASS} w-auto min-w-[9.5rem]`}
              value={normalizedRange.endDate}
              onChange={(e) =>
                setVisibleRange((prev) =>
                  normalizeVisibleRange({
                    startDate: prev.startDate,
                    endDate: e.target.value,
                  }),
                )
              }
            />
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVisibleRange(currentYearVisibleRange())}
          >
            {MBO_COPY.ganttRangeThisYear}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVisibleRange(currentMonthVisibleRange())}
          >
            {MBO_COPY.ganttRangeThisMonth}
          </Button>
        </fieldset>
      </div>

      {filteredRows.length === 0 ? (
        <div className="space-y-3">
          <EmptyState title={MBO_COPY.emptyGoalsFiltered} />
          {onClearFilters ? (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={onClearFilters}>
                {MBO_COPY.ganttFilterEmptyClear}
              </Button>
            </div>
          ) : (
            <div className="flex justify-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setVisibleRange(currentYearVisibleRange())}
              >
                {MBO_COPY.ganttRangeThisYear}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setVisibleRange(currentMonthVisibleRange())}
              >
                {MBO_COPY.ganttRangeThisMonth}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <MboFrappeGanttChart
          tasks={tasks}
          visibleRange={normalizedRange}
          scheduleEditable={scheduleEditable}
          editableProjectIds={editableProjectIds}
          onOpenProject={openProject}
          onOpenObjective={(id) => onOpenObjectiveDetail?.(id)}
          onProjectScheduleChange={(projectId, range) => {
            void onScheduleChange?.(projectId, range);
          }}
        />
      )}

    </div>
  );
}
