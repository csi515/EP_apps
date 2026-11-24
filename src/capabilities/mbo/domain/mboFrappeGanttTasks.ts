/**
 * HierarchyGanttRow → Frappe Gantt Task 매핑 (UI 라이브러리 어댑터용)
 */
import type { HierarchyGanttRow } from './mboGanttHierarchyEngine';
import {
  clipDateRangeToVisible,
  type MboGanttVisibleRange,
} from './mboGanttVisibleRange';

export const MBO_GANTT_OBJ_PREFIX = 'obj:';
export const MBO_GANTT_PROJ_PREFIX = 'proj:';
/** @deprecated spacer task 미사용 — 구간은 차트에서 gantt_start/end로 고정 */
export const MBO_GANTT_RANGE_START_ID = '__mbo_gantt_range_start__';
/** @deprecated spacer task 미사용 */
export const MBO_GANTT_RANGE_END_ID = '__mbo_gantt_range_end__';

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

export function isMboGanttRangeSpacerTaskId(id: string): boolean {
  return id === MBO_GANTT_RANGE_START_ID || id === MBO_GANTT_RANGE_END_ID;
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
  visibleRange?: MboGanttVisibleRange | null,
): MboFrappeGanttTask[] {
  const tasks: MboFrappeGanttTask[] = [];
  for (const row of rows) {
    // 간트는 실행 과제만 1행 — 목표 부모 행은 표시하지 않음
    if (row.kind === 'objective') continue;

    const ensured = ensureRange(row.startDate, row.targetDate);
    const range = visibleRange
      ? clipDateRangeToVisible(ensured.start, ensured.end, visibleRange)
      : ensured;
    if (!range) continue;

    const progress = Math.min(100, Math.max(0, row.progressRate));
    tasks.push({
      id: `${MBO_GANTT_PROJ_PREFIX}${row.id}`,
      name: row.title,
      start: range.start,
      end: range.end,
      progress,
      custom_class: 'mbo-gantt-project',
      // 빈 계획 막대 + 진행 채움
      color: '#ccfbf1',
      color_progress: '#0f766e',
    });
  }
  return tasks;
}
