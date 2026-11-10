import React, { useCallback, useMemo, useState } from 'react';
import { Calendar, Filter, Settings2 } from 'lucide-react';
import type { HierarchyGanttRow } from '../domain/mboGanttHierarchyEngine';
import {
  classifyProjectHealth,
  healthBarClass,
  type ProjectHealth,
} from '../domain/mboManagerDashboardEngine';
import { goalLockStatusLabel } from '../domain/mboTwoTierLockEngine';
import { resizeBarPercents, shiftBarPercents, type GanttBarPosition } from '../domain/mboGanttEngine';
import {
  barPercentsToTimelineRange,
  projectBarOnScale,
  scaleBuckets,
  todayPercentOnScale,
  type GanttTimeScale,
  type GanttTimelineSpanYears,
} from '../domain/mboGanttScaleEngine';
import { MBO_COPY } from './mboUiCopy';
import { pickDisplayYearForProject } from '../domain/mboCycleDisplay';
import { collectAvailableYears, type PortfolioProject } from '../domain/projectPortfolioEngine';
import type { ProjectCategory } from '../domain/projectCategoryEngine';
import { ProjectCategoryManager } from './ProjectCategoryManager';

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

type DragState = {
  kind: 'move' | 'resize-start' | 'resize-end';
  projectId: string;
  startX: number;
  origin: GanttBarPosition;
  trackWidth: number;
};

export function MboHierarchyGanttView({
  rows,
  projects,
  categories = [],
  organizationId,
  selectedProjectId,
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
  const [year, setYear] = useState(() => years[0] ?? fallbackYear);
  const [scale, setScale] = useState<GanttTimeScale>('month');
  const [spanYears, setSpanYears] = useState<GanttTimelineSpanYears>(() =>
    (years[0] ?? fallbackYear) === fallbackYear ? 2 : 1,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [draftBars, setDraftBars] = useState<Record<string, GanttBarPosition>>({});

  const buckets = useMemo(() => scaleBuckets(year, scale, spanYears), [year, scale, spanYears]);
  const todayPercent = useMemo(
    () => todayPercentOnScale(year, scale, new Date(), spanYears),
    [year, scale, spanYears],
  );

  const getBar = useCallback(
    (startDate: string, targetDate: string, projectId?: string): GanttBarPosition | null => {
      if (projectId && draftBars[projectId]) return draftBars[projectId]!;
      return projectBarOnScale(startDate, targetDate, year, scale, spanYears);
    },
    [draftBars, year, scale, spanYears],
  );

  const pxToPercent = useCallback((dx: number, trackWidth: number) => (dx / Math.max(1, trackWidth)) * 100, []);

  const finishDrag = useCallback(
    async (projectId: string, position: GanttBarPosition) => {
      setDraftBars((prev) => {
        const next = { ...prev };
        delete next[projectId];
        return next;
      });
      const range = barPercentsToTimelineRange(
        position.leftPercent,
        position.widthPercent,
        year,
        scale,
        spanYears,
      );
      await onScheduleChange?.(projectId, range);
    },
    [onScheduleChange, year, scale, spanYears],
  );

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const delta = pxToPercent(e.clientX - drag.startX, drag.trackWidth);
    let next = drag.origin;
    if (drag.kind === 'move') next = shiftBarPercents(drag.origin, delta);
    else if (drag.kind === 'resize-start') next = resizeBarPercents(drag.origin, 'start', delta);
    else next = resizeBarPercents(drag.origin, 'end', delta);
    setDraftBars((prev) => ({ ...prev, [drag.projectId]: next }));
  };

  const onPointerUp = () => {
    if (!drag) return;
    const pos = draftBars[drag.projectId] ?? drag.origin;
    void finishDrag(drag.projectId, pos);
    setDrag(null);
  };

  const openProject = (id: string) => {
    onSelectProject?.(id);
    onOpenProjectSheet?.(id);
  };

  if (rows.length === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"
        data-testid="mbo-hierarchy-gantt-empty"
      >
        <p className="text-sm text-slate-600">표시할 목표·프로젝트가 없습니다.</p>
        <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
          {onCreateProject ? (
            <button
              type="button"
              className="min-h-12 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white"
              onClick={onCreateProject}
            >
              + 새 프로젝트 연결
            </button>
          ) : null}
          {onOpenCreateObjective ? (
            <button
              type="button"
              className="min-h-12 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700"
              onClick={onOpenCreateObjective}
            >
              목표부터 등록
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const colCount = buckets.length;

  return (
    <div className="space-y-3" data-testid="mbo-hierarchy-gantt">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
          {(
            [
              { id: 'month' as const, label: '월' },
              { id: 'quarter' as const, label: '분기' },
              { id: 'year' as const, label: '연' },
            ] as const
          ).map((btn) => (
            <button
              key={btn.id}
              type="button"
              className={`min-h-11 rounded-lg px-3 text-xs font-bold ${
                scale === btn.id ? 'bg-white text-indigo-800 shadow-xs' : 'text-slate-600'
              }`}
              onClick={() => setScale(btn.id)}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {organizationId ? (
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <Filter className="h-3.5 w-3.5" />
              옵션
            </button>
          ) : null}
          {organizationId ? (
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700"
              onClick={() => setManageOpen(true)}
            >
              <Settings2 className="h-3.5 w-3.5" />
              분류
            </button>
          ) : null}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
            {(
              [
                { id: 1 as const, label: MBO_COPY.ganttSpanOne },
                { id: 2 as const, label: MBO_COPY.ganttSpanTwo(year) },
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                className={`min-h-11 rounded-lg px-2.5 text-[11px] font-bold sm:px-3 sm:text-xs ${
                  spanYears === btn.id ? 'bg-white text-indigo-800 shadow-xs' : 'text-slate-600'
                }`}
                onClick={() => setSpanYears(btn.id)}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1 text-xs font-bold text-slate-600">
            <Calendar className="h-3.5 w-3.5" />
            <select
              className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm font-semibold"
              value={year}
              onChange={(e) => {
                const y = Number(e.target.value);
                setYear(y);
                if (spanYears === 2) return;
                setSpanYears(y === fallbackYear ? 2 : 1);
              }}
            >
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

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <div className="min-w-[960px]">
          <div className="grid grid-cols-[200px_1fr] border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-500">
            <div className="sticky left-0 z-20 bg-slate-50 px-3 py-2">목표 / 프로젝트</div>
            <div
              className="grid border-l border-slate-100"
              style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
            >
              {buckets.map((b) => (
                <div key={b.key} className="border-l border-slate-100 py-2 text-center first:border-l-0">
                  {b.label}
                </div>
              ))}
            </div>
          </div>

          {rows.map((row) => {
            if (row.kind === 'objective') {
              const bar = getBar(row.startDate, row.targetDate);
              return (
                <div
                  key={`obj-${row.id}`}
                  className="grid grid-cols-[200px_1fr] border-b border-slate-100 bg-slate-50/80"
                >
                  <div className="sticky left-0 z-10 bg-slate-50/95 px-3 py-2">
                    <button
                      type="button"
                      className="block w-full text-left text-xs font-extrabold text-slate-900"
                      onClick={() => onOpenObjectiveDetail?.(row.id)}
                      title={goalLockStatusLabel(row.lockStatus)}
                    >
                      {row.title}
                    </button>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {row.ownerName} · 비중 {row.weight}%
                      {row.isStrictLocked ? ` · ${goalLockStatusLabel(row.lockStatus)}` : ''}
                    </p>
                  </div>
                  <div className="relative min-h-10 border-l border-slate-100">
                    {bar ? (
                      <div
                        className="absolute top-2 h-6 rounded-md bg-indigo-300/80"
                        style={{ left: `${bar.leftPercent}%`, width: `${bar.widthPercent}%` }}
                        title={`${row.title} · ${row.progressRate}%`}
                      />
                    ) : null}
                  </div>
                </div>
              );
            }

            const health: ProjectHealth = classifyProjectHealth(row);
            const bar = getBar(row.startDate, row.targetDate, row.id);
            const selected = selectedProjectId === row.id;
            const suggestedYear = pickDisplayYearForProject(row.startDate, row.targetDate, year);

            return (
              <div
                key={`proj-${row.id}`}
                className="grid grid-cols-[200px_1fr] border-b border-slate-100"
              >
                <button
                  type="button"
                  className={[
                    'sticky left-0 z-10 min-h-11 border-r border-slate-100 bg-white px-3 py-2 text-left',
                    selected ? 'bg-indigo-50' : '',
                  ].join(' ')}
                  onClick={() => openProject(row.id)}
                >
                  <p className="truncate pl-3 text-xs font-bold text-slate-900">{row.title}</p>
                  <p className="pl-3 text-[10px] text-slate-500">
                    {row.ownerName} · {row.progressRate}%
                  </p>
                </button>
                <div
                  data-gantt-track
                  className="relative min-h-11 border-l border-slate-100"
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerLeave={drag ? onPointerUp : undefined}
                >
                  {todayPercent != null ? (
                    <div
                      className="pointer-events-none absolute inset-y-0 z-[5] w-0.5 bg-rose-400"
                      style={{ left: `${todayPercent}%` }}
                    />
                  ) : null}
                  {bar ? (
                    <GanttBar
                      bar={bar}
                      healthClass={healthBarClass(health)}
                      progressRate={row.progressRate}
                      selected={selected}
                      scheduleEditable={scheduleEditable}
                      tooltip={`${row.title}\n담당 ${row.ownerName}\n진척 ${row.progressRate}%\n${row.startDate} ~ ${row.targetDate}`}
                      onOpen={() => openProject(row.id)}
                      onDragStart={(kind, e, origin) => {
                        if (!scheduleEditable) return;
                        const track = (e.currentTarget as HTMLElement).closest(
                          '[data-gantt-track]',
                        ) as HTMLElement | null;
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setDrag({
                          kind,
                          projectId: row.id,
                          startX: e.clientX,
                          origin,
                          trackWidth: track?.clientWidth ?? 1,
                        });
                      }}
                    />
                  ) : (
                    <div className="flex min-h-11 items-center px-2">
                      <button
                        type="button"
                        className="min-h-11 rounded-lg border border-dashed border-slate-300 px-2 text-[10px] font-bold"
                        onClick={() => setYear(suggestedYear)}
                      >
                        {suggestedYear}년 보기
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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

function GanttBar({
  bar,
  healthClass,
  progressRate,
  selected,
  scheduleEditable,
  tooltip,
  onOpen,
  onDragStart,
}: {
  bar: GanttBarPosition;
  healthClass: string;
  progressRate: number;
  selected: boolean;
  scheduleEditable: boolean;
  tooltip: string;
  onOpen: () => void;
  onDragStart: (
    kind: DragState['kind'],
    e: React.PointerEvent<HTMLElement>,
    origin: GanttBarPosition,
  ) => void;
}) {
  return (
    <div
      className="absolute z-10 flex h-11 items-stretch py-1.5"
      style={{ left: `${bar.leftPercent}%`, width: `${bar.widthPercent}%` }}
      title={tooltip}
    >
      {scheduleEditable ? (
        <button
          type="button"
          className="min-h-11 w-3 shrink-0 cursor-ew-resize rounded-l-md bg-black/20 sm:w-4"
          aria-label="시작 조정"
          onPointerDown={(e) => {
            e.stopPropagation();
            onDragStart('resize-start', e, bar);
          }}
        />
      ) : null}
      <button
        type="button"
        className={[
          'relative min-h-11 min-w-[28px] flex-1 overflow-hidden rounded-md shadow-sm',
          healthClass,
          selected ? 'ring-2 ring-indigo-400' : '',
          scheduleEditable ? 'cursor-grab active:cursor-grabbing' : '',
        ].join(' ')}
        onClick={onOpen}
        onPointerDown={(e) => {
          if (!scheduleEditable || e.button !== 0) return;
          onDragStart('move', e, bar);
        }}
      >
        <span
          className="absolute inset-y-0 left-0 bg-white/30"
          style={{ width: `${Math.min(100, Math.max(0, progressRate))}%` }}
        />
      </button>
      {scheduleEditable ? (
        <button
          type="button"
          className="min-h-11 w-3 shrink-0 cursor-ew-resize rounded-r-md bg-black/20 sm:w-4"
          aria-label="종료 조정"
          onPointerDown={(e) => {
            e.stopPropagation();
            onDragStart('resize-end', e, bar);
          }}
        />
      ) : null}
    </div>
  );
}
