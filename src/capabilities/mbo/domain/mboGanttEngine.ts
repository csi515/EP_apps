/**
 * MBO 간트 타임라인 좌표 (순수 함수)
 */

export type GanttBarPosition = {
  leftPercent: number;
  widthPercent: number;
};

function parseIso(iso: string): Date | null {
  if (!iso || iso.length < 10) return null;
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type GanttYearSpan = 1 | 2;

/** 연도 단위 타임라인 [1/1, 12/31] (span=2면 다음 해 12/31까지) */
export function timelineForYear(
  year: number,
  spanYears: GanttYearSpan = 1,
): { startMs: number; endMs: number; spanMs: number } {
  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year + spanYears - 1, 11, 31, 23, 59, 59, 999);
  const startMs = start.getTime();
  const endMs = end.getTime();
  return { startMs, endMs, spanMs: Math.max(1, endMs - startMs) };
}

export function projectBarInYear(
  startDate: string,
  targetDate: string,
  year: number,
  spanYears: GanttYearSpan = 1,
): GanttBarPosition | null {
  const timeline = timelineForYear(year, spanYears);
  const s = parseIso(startDate);
  const e = parseIso(targetDate);
  if (!s || !e) return null;

  const barStart = Math.max(s.getTime(), timeline.startMs);
  const barEnd = Math.min(e.getTime(), timeline.endMs);
  if (barEnd < barStart) return null;

  const leftPercent = ((barStart - timeline.startMs) / timeline.spanMs) * 100;
  const widthPercent = ((barEnd - barStart) / timeline.spanMs) * 100;
  return {
    leftPercent: Math.max(0, Math.min(100, leftPercent)),
    widthPercent: Math.max(0.8, Math.min(100 - leftPercent, widthPercent)),
  };
}

export function barPercentsToDateRange(
  leftPercent: number,
  widthPercent: number,
  year: number,
  spanYears: GanttYearSpan = 1,
): { startDate: string; targetDate: string } {
  const timeline = timelineForYear(year, spanYears);
  const startMs = timeline.startMs + (leftPercent / 100) * timeline.spanMs;
  const endMs = timeline.startMs + ((leftPercent + widthPercent) / 100) * timeline.spanMs;
  return {
    startDate: toIso(new Date(startMs)),
    targetDate: toIso(new Date(endMs)),
  };
}

export function shiftBarPercents(
  position: GanttBarPosition,
  deltaLeftPercent: number,
): GanttBarPosition {
  const nextLeft = Math.max(0, Math.min(100 - position.widthPercent, position.leftPercent + deltaLeftPercent));
  return { leftPercent: nextLeft, widthPercent: position.widthPercent };
}

/** 선택 연도 타임라인상 오늘 위치(0~100). 연도가 다르면 null */
export function todayPercentInYear(year: number, onDate: Date = new Date()): number | null {
  if (onDate.getFullYear() !== year) return null;
  const timeline = timelineForYear(year);
  const t = onDate.getTime();
  if (t < timeline.startMs || t > timeline.endMs) return null;
  return ((t - timeline.startMs) / timeline.spanMs) * 100;
}

export function resizeBarPercents(
  position: GanttBarPosition,
  edge: 'start' | 'end',
  deltaLeftPercent: number,
): GanttBarPosition {
  if (edge === 'start') {
    const nextLeft = Math.max(0, Math.min(position.leftPercent + position.widthPercent - 1, position.leftPercent + deltaLeftPercent));
    const width = position.leftPercent + position.widthPercent - nextLeft;
    return { leftPercent: nextLeft, widthPercent: Math.max(1, width) };
  }
  const width = Math.max(1, Math.min(100 - position.leftPercent, position.widthPercent + deltaLeftPercent));
  return { leftPercent: position.leftPercent, widthPercent: width };
}
