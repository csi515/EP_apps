import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Gantt from 'frappe-gantt';
import './mboFrappeGantt.css';
import type { MboFrappeGanttTask } from '../domain/mboFrappeGanttTasks';
import {
  formatGanttDateYmd,
  isMboGanttObjectiveTaskId,
  isMboGanttProjectTaskId,
  mboGanttObjectiveIdFromTask,
  mboGanttProjectIdFromTask,
} from '../domain/mboFrappeGanttTasks';
import {
  MBO_GANTT_BAR_HEIGHT,
  MBO_GANTT_BAR_PADDING,
  MBO_GANTT_ROW_HEIGHT,
  ganttEndForVisibleRange,
  mboFrappeViewModeForVisibleRange,
  mboFrappeViewModesForVisibleRange,
  mboGanttHeaderHeights,
  mboGanttHeaderTotalPx,
  type MboFrappeViewMode,
} from '../domain/mboFrappeGanttViewModes';
import {
  normalizeVisibleRange,
  type MboGanttVisibleRange,
} from '../domain/mboGanttVisibleRange';
import { MBO_COPY } from './mboUiCopy';

export type { MboFrappeViewMode };

const RAIL_WIDTH_STORAGE_KEY = 'mbo-gantt-name-rail-width';
const RAIL_WIDTH_DEFAULT = 184;
const RAIL_WIDTH_MIN = 128;
const RAIL_WIDTH_MAX_RATIO = 0.4;
/** 폭 미세 변동으로 축척·재생성 루프가 돌지 않도록 */
const HOST_WIDTH_STABLE_PX = 8;

type Props = {
  tasks: MboFrappeGanttTask[];
  visibleRange?: MboGanttVisibleRange | null;
  scheduleEditable?: boolean;
  editableProjectIds?: ReadonlySet<string>;
  onOpenProject?: (projectId: string) => void;
  onOpenObjective?: (objectiveId: string) => void;
  onProjectScheduleChange?: (
    projectId: string,
    range: { startDate: string; targetDate: string },
  ) => void;
};

type GanttWithApi = Gantt & {
  gantt_start: Date;
  gantt_end: Date;
  setup_date_values: () => void;
  render: () => void;
  update_options?: (options: Record<string, unknown>) => void;
  change_view_mode: (mode?: string | unknown, maintain?: boolean) => void;
};

function openTaskById(
  id: string,
  onOpenProject?: (projectId: string) => void,
  onOpenObjective?: (objectiveId: string) => void,
) {
  if (isMboGanttProjectTaskId(id)) {
    const projectId = mboGanttProjectIdFromTask(id);
    if (projectId) onOpenProject?.(projectId);
    return;
  }
  if (isMboGanttObjectiveTaskId(id)) {
    const objectiveId = mboGanttObjectiveIdFromTask(id);
    if (objectiveId) onOpenObjective?.(objectiveId);
  }
}

function readStoredRailWidth(): number {
  if (typeof window === 'undefined') return RAIL_WIDTH_DEFAULT;
  try {
    const raw = window.localStorage.getItem(RAIL_WIDTH_STORAGE_KEY);
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n) && n >= RAIL_WIDTH_MIN) return Math.round(n);
  } catch {
    /* ignore */
  }
  return RAIL_WIDTH_DEFAULT;
}

function applyVisibleRangeBounds(
  gantt: Gantt,
  range: MboGanttVisibleRange,
  mode: MboFrappeViewMode,
) {
  const g = gantt as GanttWithApi;
  if (typeof g.setup_date_values !== 'function' || typeof g.render !== 'function') return;
  const n = normalizeVisibleRange(range);
  const start = new Date(`${n.startDate}T00:00:00`);
  const end = ganttEndForVisibleRange(n, mode);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
  g.gantt_start = start;
  g.gantt_end = end;
  if (gantt.options) gantt.options.scroll_to = null;
  g.setup_date_values();
  try {
    g.render();
  } catch (cause) {
    console.error('MBO Gantt render failed', cause);
  }
}

function buildGanttOptions(args: {
  viewMode: MboFrappeViewMode;
  visibleRange: MboGanttVisibleRange;
  hostWidth: number;
  scheduleEditable: boolean;
  onOpenProjectRef: React.MutableRefObject<Props['onOpenProject']>;
  onOpenObjectiveRef: React.MutableRefObject<Props['onOpenObjective']>;
  onScheduleRef: React.MutableRefObject<Props['onProjectScheduleChange']>;
  editableRef: React.MutableRefObject<boolean>;
  editableIdsRef: React.MutableRefObject<Props['editableProjectIds']>;
  tasksRef: React.MutableRefObject<MboFrappeGanttTask[]>;
  visibleRangeRef: React.MutableRefObject<MboGanttVisibleRange | null | undefined>;
  viewModeRef: React.MutableRefObject<MboFrappeViewMode>;
  ganttRef: React.MutableRefObject<Gantt | null>;
}) {
  const headers = mboGanttHeaderHeights(args.viewMode);
  return {
    view_mode: args.viewMode,
    view_modes: mboFrappeViewModesForVisibleRange(
      args.visibleRange,
      args.hostWidth,
      args.viewMode,
    ),
    language: 'ko',
    infinite_padding: false,
    readonly_progress: true,
    readonly_dates: !args.scheduleEditable,
    // Frappe scroll_to는 upper 헤더 매칭 실패 시 TypeError → 사용하지 않음
    scroll_to: null,
    bar_height: MBO_GANTT_BAR_HEIGHT,
    padding: MBO_GANTT_BAR_PADDING,
    upper_header_height: headers.upper_header_height,
    lower_header_height: headers.lower_header_height,
    popup_on: 'click' as const,
    lines: 'both' as const,
    on_click: (task: { id?: string }) => {
      openTaskById(
        String(task.id ?? ''),
        args.onOpenProjectRef.current,
        args.onOpenObjectiveRef.current,
      );
    },
    on_date_change: (task: { id?: string }, start: Date | string, end: Date | string) => {
      const id = String(task.id ?? '');
      const mode = args.viewModeRef.current;
      const range = args.visibleRangeRef.current;
      const gantt = args.ganttRef.current;
      const resync = () => {
        if (!gantt || !range) return;
        gantt.refresh(args.tasksRef.current.map((t) => ({ ...t })));
        applyVisibleRangeBounds(gantt, range, mode);
      };
      if (!args.editableRef.current || isMboGanttObjectiveTaskId(id)) {
        resync();
        return;
      }
      const projectId = mboGanttProjectIdFromTask(id);
      if (!projectId) return;
      const allowed = args.editableIdsRef.current;
      if (allowed && !allowed.has(projectId)) {
        resync();
        return;
      }
      args.onScheduleRef.current?.(projectId, {
        startDate: formatGanttDateYmd(start),
        targetDate: formatGanttDateYmd(end),
      });
    },
  };
}

/**
 * Frappe Gantt React 어댑터.
 * host를 key로 리마운트하지 않고, 폭·모드 변경은 update_options로 처리해 깜빡임을 막는다.
 */
export const MboFrappeGanttChart: React.FC<Props> = ({
  tasks,
  visibleRange = null,
  scheduleEditable = true,
  editableProjectIds,
  onOpenProject,
  onOpenObjective,
  onProjectScheduleChange,
}) => {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const ganttRef = useRef<Gantt | null>(null);
  const initGenRef = useRef(0);
  const tasksRef = useRef(tasks);
  const onOpenProjectRef = useRef(onOpenProject);
  const onOpenObjectiveRef = useRef(onOpenObjective);
  const onScheduleRef = useRef(onProjectScheduleChange);
  const editableRef = useRef(scheduleEditable);
  const editableIdsRef = useRef(editableProjectIds);
  const visibleRangeRef = useRef(visibleRange);
  const viewModeRef = useRef<MboFrappeViewMode>('Month');

  const [railWidth, setRailWidth] = useState(readStoredRailWidth);
  const [hostWidth, setHostWidth] = useState(0);

  const rangeKey = visibleRange
    ? `${visibleRange.startDate}|${visibleRange.endDate}`
    : '';

  const viewMode: MboFrappeViewMode = useMemo(() => {
    if (!visibleRange) return 'Month';
    return mboFrappeViewModeForVisibleRange(visibleRange, hostWidth || null);
  }, [visibleRange, hostWidth]);

  viewModeRef.current = viewMode;
  const hostReady = hostWidth > 0;

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);
  useEffect(() => {
    visibleRangeRef.current = visibleRange;
  }, [visibleRange]);
  useEffect(() => {
    onOpenProjectRef.current = onOpenProject;
  }, [onOpenProject]);
  useEffect(() => {
    onOpenObjectiveRef.current = onOpenObjective;
  }, [onOpenObjective]);
  useEffect(() => {
    onScheduleRef.current = onProjectScheduleChange;
  }, [onProjectScheduleChange]);
  useEffect(() => {
    editableRef.current = scheduleEditable;
  }, [scheduleEditable]);
  useEffect(() => {
    editableIdsRef.current = editableProjectIds;
  }, [editableProjectIds]);

  // 셸 폭을 관측 (host가 아니라) — gantt 생성으로 인한 스크롤바/높이 변화가 폭 루프를 만들지 않게
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || typeof ResizeObserver === 'undefined') return;

    const measure = () => {
      const host = hostRef.current;
      const w = host
        ? Math.round(host.getBoundingClientRect().width)
        : Math.max(0, Math.round(shell.getBoundingClientRect().width) - railWidth);
      if (w <= 0) return;
      setHostWidth((prev) =>
        Math.abs(prev - w) < HOST_WIDTH_STABLE_PX ? prev : w,
      );
    };

    const ro = new ResizeObserver(() => measure());
    ro.observe(shell);
    measure();
    return () => ro.disconnect();
  }, [railWidth]);

  // 구간 변경·최초 폭 확보 시에만 재생성. 폭 미세 변동은 아래 update_options.
  useEffect(() => {
    const el = hostRef.current;
    if (!el || !visibleRange || !hostReady) return;

    const gen = ++initGenRef.current;
    const mode = mboFrappeViewModeForVisibleRange(visibleRange, hostWidth);
    const seed = tasksRef.current.map((t) => ({ ...t }));
    const options = buildGanttOptions({
      viewMode: mode,
      visibleRange,
      hostWidth,
      scheduleEditable: editableRef.current,
      onOpenProjectRef,
      onOpenObjectiveRef,
      onScheduleRef,
      editableRef,
      editableIdsRef,
      tasksRef,
      visibleRangeRef,
      viewModeRef,
      ganttRef,
    });

    try {
      el.innerHTML = '';
      ganttRef.current = new Gantt(el, seed, options);
      if (gen !== initGenRef.current) return;
      applyVisibleRangeBounds(ganttRef.current, visibleRange, mode);
      const container = el.querySelector('.gantt-container');
      if (container instanceof HTMLElement) container.scrollLeft = 0;
    } catch (cause) {
      console.error('MBO Gantt init failed', cause);
      el.innerHTML = '';
      ganttRef.current = null;
    }

    return () => {
      initGenRef.current += 1;
      el.innerHTML = '';
      ganttRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey, hostReady]);

  // 폭·모드 변경: 인스턴스 유지한 채 축척만 갱신 (깜빡임 방지)
  useEffect(() => {
    const g = ganttRef.current as GanttWithApi | null;
    if (!g || !visibleRange || !hostReady) return;
    const headers = mboGanttHeaderHeights(viewMode);
    const viewModes = mboFrappeViewModesForVisibleRange(visibleRange, hostWidth, viewMode);
    try {
      if (typeof g.update_options === 'function') {
        g.update_options({
          view_mode: viewMode,
          view_modes: viewModes,
          upper_header_height: headers.upper_header_height,
          lower_header_height: headers.lower_header_height,
          scroll_to: null,
        });
      } else {
        g.change_view_mode(viewMode, true);
      }
      applyVisibleRangeBounds(g, visibleRange, viewMode);
      const container = hostRef.current?.querySelector('.gantt-container');
      if (container instanceof HTMLElement) container.scrollLeft = 0;
    } catch (cause) {
      console.error('MBO Gantt scale update failed', cause);
    }
  }, [viewMode, hostWidth, visibleRange, hostReady]);

  // 과제 목록만 바뀌면 refresh
  useEffect(() => {
    const g = ganttRef.current;
    if (!g) return;
    try {
      g.refresh(tasks.map((t) => ({ ...t })));
      const range = visibleRangeRef.current;
      if (range) applyVisibleRangeBounds(g, range, viewModeRef.current);
    } catch (cause) {
      console.error('MBO Gantt refresh failed', cause);
    }
  }, [tasks]);

  useEffect(() => {
    if (!ganttRef.current) return;
    ganttRef.current.options.readonly_dates = !scheduleEditable;
  }, [scheduleEditable]);

  const onRailResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const shell = shellRef.current;
      if (!shell) return;
      const startX = event.clientX;
      const startWidth = railWidth;
      const shellWidth = shell.getBoundingClientRect().width;
      const maxWidth = Math.max(RAIL_WIDTH_MIN, Math.floor(shellWidth * RAIL_WIDTH_MAX_RATIO));

      const onMove = (e: PointerEvent) => {
        const next = Math.min(maxWidth, Math.max(RAIL_WIDTH_MIN, startWidth + (e.clientX - startX)));
        setRailWidth(next);
      };
      const onUp = (e: PointerEvent) => {
        const next = Math.min(maxWidth, Math.max(RAIL_WIDTH_MIN, startWidth + (e.clientX - startX)));
        setRailWidth(next);
        try {
          window.localStorage.setItem(RAIL_WIDTH_STORAGE_KEY, String(Math.round(next)));
        } catch {
          /* ignore */
        }
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [railWidth],
  );

  const headerPx = mboGanttHeaderTotalPx(viewMode);

  return (
    <div className="mbo-gantt-shell" data-testid="mbo-frappe-gantt" ref={shellRef}>
      <aside
        className="mbo-gantt-name-rail"
        aria-label={MBO_COPY.ganttNameColumnHeader}
        style={{ width: railWidth, flexBasis: railWidth }}
      >
        <div className="mbo-gantt-name-rail__head" style={{ height: headerPx }}>
          {MBO_COPY.ganttNameColumnHeader}
        </div>
        <div className="mbo-gantt-name-rail__body">
          {tasks.map((task) => {
            const id = String(task.id);
            const isObjective = isMboGanttObjectiveTaskId(id);
            return (
              <button
                key={id}
                type="button"
                className={
                  isObjective
                    ? 'mbo-gantt-name-rail__row mbo-gantt-name-rail__row--objective'
                    : 'mbo-gantt-name-rail__row'
                }
                style={{ height: MBO_GANTT_ROW_HEIGHT }}
                title={task.name.trim()}
                onClick={() =>
                  openTaskById(id, onOpenProjectRef.current, onOpenObjectiveRef.current)
                }
              >
                <span className="mbo-gantt-name-rail__label">{task.name.trim()}</span>
              </button>
            );
          })}
        </div>
        <div
          className="mbo-gantt-name-rail__resize"
          role="separator"
          aria-orientation="vertical"
          aria-label={MBO_COPY.ganttNameColumnHeader}
          onPointerDown={onRailResizeStart}
        />
      </aside>
      <div className="mbo-frappe-gantt-host min-h-[280px]" ref={hostRef} />
    </div>
  );
};
