/** MboCycleSettings UI 표시·날짜 입력 변환 (순수 함수) */
import { calendarDate, type MboCycleSettings } from './mboCycle';

export function formatLockLabel(settings: MboCycleSettings): string {
  if (!settings.goalLockEnabled) return '목표 수정 가능';
  return `목표 수정 마감 ${settings.goalLockMonth}월 ${settings.goalLockDay}일`;
}

export function formatReviewLabel(settings: MboCycleSettings): string {
  return `평가 ${settings.reviewStartMonth}/${settings.reviewStartDay} ~ ${settings.reviewEndMonth}/${settings.reviewEndDay}`;
}

export function lockDateToIso(year: number, settings: MboCycleSettings): string {
  const d = calendarDate(year, settings.goalLockMonth, settings.goalLockDay);
  return toIsoDate(d);
}

export function reviewStartToIso(year: number, settings: MboCycleSettings): string {
  const d = calendarDate(year, settings.reviewStartMonth, settings.reviewStartDay);
  return toIsoDate(d);
}

export function reviewEndToIso(year: number, settings: MboCycleSettings): string {
  const d = calendarDate(year, settings.reviewEndMonth, settings.reviewEndDay);
  return toIsoDate(d);
}

export function isoToMonthDay(iso: string): { month: number; day: number } {
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  return { month: m, day: d };
}

export function applyLockDate(settings: MboCycleSettings, iso: string): MboCycleSettings {
  const { month, day } = isoToMonthDay(iso);
  return { ...settings, goalLockMonth: month, goalLockDay: day };
}

export function applyReviewStart(settings: MboCycleSettings, iso: string): MboCycleSettings {
  const { month, day } = isoToMonthDay(iso);
  return { ...settings, reviewStartMonth: month, reviewStartDay: day };
}

export function applyReviewEnd(settings: MboCycleSettings, iso: string): MboCycleSettings {
  const { month, day } = isoToMonthDay(iso);
  return { ...settings, reviewEndMonth: month, reviewEndDay: day };
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function pickDisplayYearForProject(startDate: string, targetDate: string, fallback: number): number {
  const s = startDate?.slice(0, 4);
  const t = targetDate?.slice(0, 4);
  const sy = s ? Number(s) : fallback;
  const ty = t ? Number(t) : fallback;
  if (Number.isFinite(sy) && sy !== fallback) return sy;
  if (Number.isFinite(ty)) return ty;
  return fallback;
}
