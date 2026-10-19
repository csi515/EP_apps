/** MBO 목표 잠금·연말 평가 창 판정 (DB 함수와 동일 규칙). 급여·승진과 연결하지 않는다. */

export type MboCycleSettings = {
  goalLockEnabled: boolean;
  goalLockMonth: number;
  goalLockDay: number;
  reviewStartMonth: number;
  reviewStartDay: number;
  reviewEndMonth: number;
  reviewEndDay: number;
};

export const DEFAULT_MBO_CYCLE: MboCycleSettings = {
  goalLockEnabled: true,
  goalLockMonth: 1,
  goalLockDay: 31,
  reviewStartMonth: 12,
  reviewStartDay: 1,
  reviewEndMonth: 12,
  reviewEndDay: 31,
};

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function calendarDate(year: number, month: number, day: number): Date {
  const clamped = Math.min(Math.max(1, day), daysInMonth(year, month));
  return new Date(year, month - 1, clamped);
}

function sameDayCompare(a: Date, b: Date): number {
  const ax = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bx = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return ax === bx ? 0 : ax < bx ? -1 : 1;
}

/** 잠금이 켜져 있고 기준일이 잠금일보다 이후이면 true. */
export function areGoalsLocked(settings: MboCycleSettings, onDate: Date): boolean {
  if (!settings.goalLockEnabled) return false;
  const lock = calendarDate(onDate.getFullYear(), settings.goalLockMonth, settings.goalLockDay);
  return sameDayCompare(onDate, lock) > 0;
}

/** 같은 연도 시작·종료 월일 사이(포함)이면 true. */
export function isReviewWindowOpen(settings: MboCycleSettings, onDate: Date): boolean {
  const y = onDate.getFullYear();
  const start = calendarDate(y, settings.reviewStartMonth, settings.reviewStartDay);
  const end = calendarDate(y, settings.reviewEndMonth, settings.reviewEndDay);
  return sameDayCompare(onDate, start) >= 0 && sameDayCompare(onDate, end) <= 0;
}

export function normalizeCycleSettings(input: Partial<MboCycleSettings> | null | undefined): MboCycleSettings {
  return {
    goalLockEnabled: input?.goalLockEnabled ?? DEFAULT_MBO_CYCLE.goalLockEnabled,
    goalLockMonth: input?.goalLockMonth ?? DEFAULT_MBO_CYCLE.goalLockMonth,
    goalLockDay: input?.goalLockDay ?? DEFAULT_MBO_CYCLE.goalLockDay,
    reviewStartMonth: input?.reviewStartMonth ?? DEFAULT_MBO_CYCLE.reviewStartMonth,
    reviewStartDay: input?.reviewStartDay ?? DEFAULT_MBO_CYCLE.reviewStartDay,
    reviewEndMonth: input?.reviewEndMonth ?? DEFAULT_MBO_CYCLE.reviewEndMonth,
    reviewEndDay: input?.reviewEndDay ?? DEFAULT_MBO_CYCLE.reviewEndDay,
  };
}
