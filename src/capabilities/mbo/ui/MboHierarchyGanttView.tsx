import React, { useMemo, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { SegmentedControl } from '@/shared/components/ui/SegmentedControl';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { FORM_CONTROL_CLASS } from '@/shared/components/ui/FormField';
import type { HierarchyGanttRow } from '../domain/mboGanttHierarchyEngine';
import { buildMboFrappeGanttTasks } from '../domain/mboFrappeGanttTasks';
import { MBO_COPY } from './mboUiCopy';
import { collectAvailableYears, type PortfolioProject } from '../domain/projectPortfolioEngine';
import type { ProjectCategory } from '../domain/projectCategoryEngine';
import { ProjectCategoryManager } from './ProjectCategoryManager';
import { MboFrappeGanttChart, type MboFrappeViewMode } from './MboFrappeGanttChart';

export type MboHierarchyGanttViewProps = {
  rows: HierarchyGanttRow[];
  projects: PortfolioProject[];
  categories?: ProjectCategory[];
  organizationId?: string | null;
  selectedProjectId?: string | null;
  scheduleEditable?: boolean;
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
};

export function MboHierarchyGanttView({
  rows,
  projects,
  categories = [],
  organizationId,
  scheduleEditable = true,
  onSelectProject,
  onOpenProjectSheet,
  onScheduleChange,
  onCategoriesChanged,
  onCreateProject,
  onOpenCreateObjective,
  onOpenObjectiveDetail,
}: MboHierarchyGanttViewProps) {
  const fallbackYear = new Date().getFullYear();
  const years = useMemo(() => collectAvailableYears(projects, fallbackYear), [projects, fallbackYear]);
  const [viewMode, setViewMode] = useState<MboFrappeViewMode>('Month');
  const [yearFilter, setYearFilter] = useState<number | 'all'>(fallbackYear);
  const [manageOpen, setManageOpen] = useState(false);

  const filteredRows = useMemo(() => {
    if (yearFilter === 'all') return rows;
    return rows.filter((row) => {
      const y0 = Number((row.startDate || '').slice(0, 4));
      const y1 = Number((row.targetDate || '').slice(0, 4));
      if (!y0 && !y1) return true;
      return y0 === yearFilter || y1 === yearFilter || (y0 < yearFilter && y1 > yearFilter);
    });
  }, [rows, yearFilter]);

  const tasks = useMemo(() => buildMboFrappeGanttTasks(filteredRows), [filteredRows]);

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          value={viewMode}
          onChange={(v) => setViewMode(v)}
          activeClassName="bg-slate-800 text-white shadow-none"
          options={[
            { value: 'Week', label: '주' },
            { value: 'Month', label: '월' },
            { value: 'Year', label: '연' },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          {organizationId ? (
            <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
              <Settings2 className="h-3.5 w-3.5" />
              분류
            </Button>
          ) : null}
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            {MBO_COPY.ganttYearLabel}
            <select
              className={`${FORM_CONTROL_CLASS} w-auto min-w-[7rem]`}
              value={yearFilter === 'all' ? 'all' : String(yearFilter)}
              onChange={(e) => {
                const v = e.target.value;
                setYearFilter(v === 'all' ? 'all' : Number(v));
              }}
            >
              <option value="all">{MBO_COPY.ganttYearAll}</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-500">{MBO_COPY.ganttDragHint}</p>

      {tasks.length === 0 ? (
        <EmptyState title={MBO_COPY.emptyGoalsFiltered} />
      ) : (
        <MboFrappeGanttChart
          tasks={tasks}
          viewMode={viewMode}
          scheduleEditable={scheduleEditable}
          onOpenProject={openProject}
          onOpenObjective={(id) => onOpenObjectiveDetail?.(id)}
          onProjectScheduleChange={(projectId, range) => {
            void onScheduleChange?.(projectId, range);
          }}
        />
      )}

      {manageOpen && organizationId ? (
        <ProjectCategoryManager
          organizationId={organizationId}
          categories={categories}
          onChanged={() => onCategoriesChanged?.()}
          onClose={() => setManageOpen(false)}
        />
      ) : null}
    </div>
  );
}
