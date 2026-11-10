/**
 * 간트 타임라인 스케일 (월/분기/연)
 */
import type { GanttBarPosition } from './mboGanttEngine';

export type GanttTimeScale = 'month' | 'quarter' | 'year';

/** 1 = 선택 연도만, 2 = 선택 연도 + 다음 연도 연속 */
export type GanttTimelineSpanYears = 1 | 2;

export type ScaleBucket = {
  key: string;
  label: string;
  startMs: number;
  endMs: number;
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

function timelineEndYear(year: number, spanYears: GanttTimelineSpanYears): number {
  return year + spanYears - 1;
}

export function timelineBounds(
  year: number,
  scale: GanttTimeScale,
  spanYears: GanttTimelineSpanYears = 1,
): { startMs: number; endMs: number; spanMs: number } {
  const buckets = scaleBuckets(year, scale, spanYears);
  const startMs = buckets[0]!.startMs;
  const endMs = buckets[buckets.length - 1]!.endMs;
  return { startMs, endMs, spanMs: Math.max(1, endMs - startMs) };
}

export function scaleBuckets(
  year: number,
  scale: GanttTimeScale,
  spanYears: GanttTimelineSpanYears = 1,
): ScaleBucket[] {
  const endYear = timelineEndYear(year, spanYears);

  if (scale === 'year') {
    return Array.from({ length: spanYears }, (_, i) => {
      const y = year + i;
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31, 23, 59, 59, 999);
      return {
        key: String(y),
        label: `${y}년`,
        startMs: start.getTime(),
        endMs: end.getTime(),
      };
    });
  }
  if (scale === 'quarter') {
    const buckets: ScaleBucket[] = [];
    for (let y = year; y <= endYear; y += 1) {
      for (let q = 1; q <= 4; q += 1) {
        const startMonth = (q - 1) * 3;
        const start = new Date(y, startMonth, 1);
        const end = new Date(y, startMonth + 3, 0, 23, 59, 59, 999);
        buckets.push({
          key: `${y}-Q${q}`,
          label: spanYears > 1 ? `${String(y).slice(2)}년 Q${q}` : `Q${q}`,
          startMs: start.getTime(),
          endMs: end.getTime(),
        });
      }
    }
    return buckets;
  }
  const buckets: ScaleBucket[] = [];
  for (let y = year; y <= endYear; y += 1) {
    for (let i = 0; i < 12; i += 1) {
      const start = new Date(y, i, 1);
      const end = new Date(y, i + 1, 0, 23, 59, 59, 999);
      buckets.push({
        key: `${y}-M${i + 1}`,
        label: spanYears > 1 ? `${String(y).slice(2)}.${i + 1}` : `${i + 1}월`,
        startMs: start.getTime(),
        endMs: end.getTime(),
      });
    }
  }
  return buckets;
}

export function projectBarOnScale(
  startDate: string,
  targetDate: string,
  year: number,
  scale: GanttTimeScale,
  spanYears: GanttTimelineSpanYears = 1,
): GanttBarPosition | null {
  const buckets = scaleBuckets(year, scale, spanYears);
  const timelineStart = buckets[0]!.startMs;
  const timelineEnd = buckets[buckets.length - 1]!.endMs;
  const span = Math.max(1, timelineEnd - timelineStart);

  const s = parseIso(startDate);
  const e = parseIso(targetDate);
  if (!s || !e) return null;

  const barStart = Math.max(s.getTime(), timelineStart);
  const barEnd = Math.min(e.getTime(), timelineEnd);
  if (barEnd < barStart) return null;

  const leftPercent = ((barStart - timelineStart) / span) * 100;
  const widthPercent = ((barEnd - barStart) / span) * 100;
  return {
    leftPercent: Math.max(0, Math.min(100, leftPercent)),
    widthPercent: Math.max(0.8, Math.min(100 - leftPercent, widthPercent)),
  };
}

export function barPercentsToTimelineRange(
  leftPercent: number,
  widthPercent: number,
  year: number,
  scale: GanttTimeScale,
  spanYears: GanttTimelineSpanYears = 1,
): { startDate: string; targetDate: string } {
  const { startMs, spanMs } = timelineBounds(year, scale, spanYears);
  const start = startMs + (leftPercent / 100) * spanMs;
  const end = startMs + ((leftPercent + widthPercent) / 100) * spanMs;
  return {
    startDate: toIso(new Date(start)),
    targetDate: toIso(new Date(end)),
  };
}

export function todayPercentOnScale(
  year: number,
  scale: GanttTimeScale,
  onDate = new Date(),
  spanYears: GanttTimelineSpanYears = 1,
): number | null {
  const buckets = scaleBuckets(year, scale, spanYears);
  const timelineStart = buckets[0]!.startMs;
  const timelineEnd = buckets[buckets.length - 1]!.endMs;
  const t = onDate.getTime();
  if (t < timelineStart || t > timelineEnd) return null;
  return ((t - timelineStart) / Math.max(1, timelineEnd - timelineStart)) * 100;
}
