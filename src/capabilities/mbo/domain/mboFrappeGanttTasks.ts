/**
 * HierarchyGanttRow → Frappe Gantt Task 매핑 (UI 라이브러리 어댑터용)
 */
import type { HierarchyGanttRow } from './mboGanttHierarchyEngine';

export const MBO_GANTT_OBJ_PREFIX = 'obj:';
export const MBO_GANTT_PROJ_PREFIX = 'proj:';

export type MboFrappeGanttTask = {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  dependencies?: string;
  custom_class?: string;
  color?: string;
  color_progress?: string;
};

function ensureRange(start: string, end: string): { start: string; end: string } {
  const s = (start || '').slice(0, 10);
  const e = (end || '').slice(0, 10);
  if (!s && !e) {
    const today = new Date().toISOString().slice(0, 10);
    return { start: today, end: today };
  }
  if (!s) return { start: e, end: e };
  if (!e) return { start: s, end: s };
  return s <= e ? { start: s, end: e } : { start: e, end: s };
}

export function isMboGanttProjectTaskId(id: string): boolean {
  return id.startsWith(MBO_GANTT_PROJ_PREFIX);
}

export function isMboGanttObjectiveTaskId(id: string): boolean {
  return id.startsWith(MBO_GANTT_OBJ_PREFIX);
}

export function mboGanttProjectIdFromTask(id: string): string | null {
  return isMboGanttProjectTaskId(id) ? id.slice(MBO_GANTT_PROJ_PREFIX.length) : null;
}

export function mboGanttObjectiveIdFromTask(id: string): string | null {
  return isMboGanttObjectiveTaskId(id) ? id.slice(MBO_GANTT_OBJ_PREFIX.length) : null;
}

/** Frappe on_date_change 종료일을 YYYY-MM-DD로 정규화 */
export function formatGanttDateYmd(value: Date | string): string {
  if (typeof value === 'string') return value.slice(0, 10);
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildMboFrappeGanttTasks(
  rows: readonly HierarchyGanttRow[],
): MboFrappeGanttTask[] {
  const tasks: MboFrappeGanttTask[] = [];
  for (const row of rows) {
    const range = ensureRange(row.startDate, row.targetDate);
    if (row.kind === 'objective') {
      tasks.push({
        id: `${MBO_GANTT_OBJ_PREFIX}${row.id}`,
        name: row.title,
        start: range.start,
        end: range.end,
        progress: Math.min(100, Math.max(0, row.progressRate)),
        custom_class: 'mbo-gantt-objective',
        color: '#94a3b8',
        color_progress: '#64748b',
      });
      continue;
    }
    tasks.push({
      id: `${MBO_GANTT_PROJ_PREFIX}${row.id}`,
      name: `  ${row.title}`,
      start: range.start,
      end: range.end,
      progress: Math.min(100, Math.max(0, row.progressRate)),
      dependencies: row.objectiveId ? `${MBO_GANTT_OBJ_PREFIX}${row.objectiveId}` : undefined,
      custom_class: 'mbo-gantt-project',
      color: '#0f766e',
      color_progress: '#115e59',
    });
  }
  return tasks;
}
