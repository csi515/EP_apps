import React, { useEffect, useRef } from 'react';
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

export type MboFrappeViewMode = 'Week' | 'Month' | 'Year';

type Props = {
  tasks: MboFrappeGanttTask[];
  viewMode: MboFrappeViewMode;
  scheduleEditable?: boolean;
  onOpenProject?: (projectId: string) => void;
  onOpenObjective?: (objectiveId: string) => void;
  onProjectScheduleChange?: (
    projectId: string,
    range: { startDate: string; targetDate: string },
  ) => void;
};

/**
 * Frappe Gantt(MIT) React 어댑터 — 인스턴스는 마운트 1회, 데이터는 refresh.
 */
export const MboFrappeGanttChart: React.FC<Props> = ({
  tasks,
  viewMode,
  scheduleEditable = true,
  onOpenProject,
  onOpenObjective,
  onProjectScheduleChange,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const ganttRef = useRef<Gantt | null>(null);
  const tasksRef = useRef(tasks);
  const onOpenProjectRef = useRef(onOpenProject);
  const onOpenObjectiveRef = useRef(onOpenObjective);
  const onScheduleRef = useRef(onProjectScheduleChange);
  const editableRef = useRef(scheduleEditable);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);
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
    const el = hostRef.current;
    if (!el) return;

    const seed = tasksRef.current.length > 0 ? tasksRef.current.map((t) => ({ ...t })) : [];
    ganttRef.current = new Gantt(el, seed, {
      view_mode: viewMode,
      language: 'ko',
      infinite_padding: false,
      readonly_progress: true,
      readonly_dates: !editableRef.current,
      scroll_to: 'today',
      bar_height: 28,
      padding: 14,
      popup_on: 'click',
      lines: 'both',
      on_click: (task) => {
        const id = String(task.id ?? '');
        if (isMboGanttProjectTaskId(id)) {
          const projectId = mboGanttProjectIdFromTask(id);
          if (projectId) onOpenProjectRef.current?.(projectId);
          return;
        }
        if (isMboGanttObjectiveTaskId(id)) {
          const objectiveId = mboGanttObjectiveIdFromTask(id);
          if (objectiveId) onOpenObjectiveRef.current?.(objectiveId);
        }
      },
      on_date_change: (task, start, end) => {
        const id = String(task.id ?? '');
        if (!editableRef.current || isMboGanttObjectiveTaskId(id)) {
          ganttRef.current?.refresh(tasksRef.current.map((t) => ({ ...t })));
          return;
        }
        const projectId = mboGanttProjectIdFromTask(id);
        if (!projectId) return;
        onScheduleRef.current?.(projectId, {
          startDate: formatGanttDateYmd(start),
          targetDate: formatGanttDateYmd(end),
        });
      },
    });

    return () => {
      el.innerHTML = '';
      ganttRef.current = null;
    };
    // viewMode는 별도 effect에서 change_view_mode
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  useEffect(() => {
    ganttRef.current?.refresh(tasks.map((t) => ({ ...t })));
  }, [tasks]);

  useEffect(() => {
    ganttRef.current?.change_view_mode(viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!ganttRef.current) return;
    ganttRef.current.options.readonly_dates = !scheduleEditable;
  }, [scheduleEditable]);

  return (
    <div
      className="mbo-frappe-gantt-host min-h-[280px]"
      data-testid="mbo-frappe-gantt"
      ref={hostRef}
    />
  );
};
