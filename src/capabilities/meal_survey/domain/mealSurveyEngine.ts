/** 사내 식수인원 조사 순수 검증·집계·기간 유틸 */

export type MemberWithRole = {
  role?: string | null;
  permissions?: Record<string, boolean> | null;
};

export type MealSlot = 'breakfast' | 'lunch' | 'dinner';
export type MealResponseStatus = 'eating' | 'skipping';
export type MealCellStatus = MealResponseStatus | null;

/** JS Date.getDay() — 0=일 … 6=토. 기본 식당 휴무는 토·일 */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type MealSurveySettings = {
  offerBreakfast: boolean;
  offerLunch: boolean;
  offerDinner: boolean;
  /** 평일 기본 식사(표시·미응답 시 eating으로 간주하는 정책 플래그) */
  defaultEating: boolean;
  breakfastCutoffTime: string;
  breakfastCutoffPrevDay: boolean;
  lunchCutoffTime: string;
  lunchCutoffPrevDay: boolean;
  dinnerCutoffTime: string;
  dinnerCutoffPrevDay: boolean;
  /** 매주 반복 휴무 요일(기본: 토·일) */
  closedWeekdays: WeekdayIndex[];
  /** 요일과 별도로 지정한 휴무일(YYYY-MM-DD) */
  closedDates: string[];
  /** 휴무 요일이라도 식당을 여는 예외일(YYYY-MM-DD) */
  openDates: string[];
};

export const DEFAULT_CLOSED_WEEKDAYS: WeekdayIndex[] = [0, 6];

export const WEEKDAY_LABELS: Record<WeekdayIndex, string> = {
  0: '일',
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
};

export const DEFAULT_MEAL_SURVEY_SETTINGS: MealSurveySettings = {
  offerBreakfast: false,
  offerLunch: true,
  offerDinner: false,
  defaultEating: true,
  breakfastCutoffTime: '17:00',
  breakfastCutoffPrevDay: true,
  lunchCutoffTime: '09:00',
  lunchCutoffPrevDay: false,
  dinnerCutoffTime: '15:00',
  dinnerCutoffPrevDay: false,
  closedWeekdays: [...DEFAULT_CLOSED_WEEKDAYS],
  closedDates: [],
  openDates: [],
};

export type MealDayAggregate = {
  mealDate: string;
  mealSlot: MealSlot;
  eatingCount: number;
  skippingCount: number;
  unsetCount: number;
};

export function canManageMealSurveyActivity(member: MemberWithRole): boolean {
  if (member.role === 'owner' || member.role === 'admin') return true;
  const perms = member.permissions ?? {};
  return perms['meal_survey:manage'] === true;
}

export function validateMealSurveySettings(
  settings: MealSurveySettings
): { isValid: boolean; error?: string } {
  if (!settings.offerBreakfast && !settings.offerLunch && !settings.offerDinner) {
    return { isValid: false, error: '조식·중식·석식 중 최소 하나는 제공해야 합니다.' };
  }
  const weekdays = settings.closedWeekdays ?? [];
  if (weekdays.some((d) => d < 0 || d > 6)) {
    return { isValid: false, error: '휴무 요일 값이 올바르지 않습니다.' };
  }
  if (weekdays.length >= 7) {
    return { isValid: false, error: '모든 요일을 휴무로 둘 수 없습니다. 최소 하루는 운영하세요.' };
  }
  return { isValid: true };
}

function uniqueSortedDates(dates: readonly string[]): string[] {
  return [...new Set(dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
}

function uniqueWeekdays(days: readonly number[]): WeekdayIndex[] {
  const set = new Set<WeekdayIndex>();
  for (const d of days) {
    if (d >= 0 && d <= 6) set.add(d as WeekdayIndex);
  }
  return [...set].sort((a, b) => a - b);
}

export function normalizeClosedWeekdays(
  days: readonly number[] | null | undefined
): WeekdayIndex[] {
  // null/undefined → 기본 토·일. 빈 배열은 「요일 휴무 없음」의도.
  if (days == null) return [...DEFAULT_CLOSED_WEEKDAYS];
  return uniqueWeekdays(days);
}

/** 해당 날짜에 식당이 문을 닫는지 (예외 개장일 우선) */
export function isCafeteriaClosedOn(
  settings: Pick<MealSurveySettings, 'closedWeekdays' | 'closedDates' | 'openDates'>,
  mealDate: string
): boolean {
  const open = new Set(settings.openDates ?? []);
  if (open.has(mealDate)) return false;
  const closed = new Set(settings.closedDates ?? []);
  if (closed.has(mealDate)) return true;
  const weekday = parseDateKey(mealDate).getDay() as WeekdayIndex;
  const closedWeekdays = settings.closedWeekdays ?? DEFAULT_CLOSED_WEEKDAYS;
  return closedWeekdays.includes(weekday);
}

/**
 * 관리자 달력에서 날짜를 누르면 휴무↔운영을 토글한다.
 * - 평소 운영일 → 휴무일(closedDates)에 추가/제거
 * - 평소 휴무 요일 → 예외 개장(openDates)에 추가/제거
 */
export function toggleCafeteriaClosedDate(
  settings: MealSurveySettings,
  mealDate: string
): MealSurveySettings {
  const weekday = parseDateKey(mealDate).getDay() as WeekdayIndex;
  const closedWeekdays = normalizeClosedWeekdays(settings.closedWeekdays);
  const normallyClosed = closedWeekdays.includes(weekday);
  const closedDates = new Set(settings.closedDates ?? []);
  const openDates = new Set(settings.openDates ?? []);

  if (normallyClosed) {
    if (openDates.has(mealDate)) openDates.delete(mealDate);
    else openDates.add(mealDate);
  } else if (closedDates.has(mealDate)) {
    closedDates.delete(mealDate);
  } else {
    closedDates.add(mealDate);
  }

  return {
    ...settings,
    closedWeekdays,
    closedDates: uniqueSortedDates([...closedDates]),
    openDates: uniqueSortedDates([...openDates]),
  };
}

export function toggleClosedWeekday(
  settings: MealSurveySettings,
  weekday: WeekdayIndex
): MealSurveySettings {
  const set = new Set(normalizeClosedWeekdays(settings.closedWeekdays));
  if (set.has(weekday)) set.delete(weekday);
  else set.add(weekday);
  return {
    ...settings,
    closedWeekdays: uniqueWeekdays([...set]),
  };
}

export function listOperatingDatesInRange(
  settings: Pick<MealSurveySettings, 'closedWeekdays' | 'closedDates' | 'openDates'>,
  fromKey: string,
  toKey: string
): string[] {
  return listDatesInRange(fromKey, toKey).filter((d) => !isCafeteriaClosedOn(settings, d));
}

export function activeMealSlots(settings: MealSurveySettings): MealSlot[] {
  const slots: MealSlot[] = [];
  if (settings.offerBreakfast) slots.push('breakfast');
  if (settings.offerLunch) slots.push('lunch');
  if (settings.offerDinner) slots.push('dinner');
  return slots;
}

export function isMealSlotOffered(settings: MealSurveySettings, slot: MealSlot): boolean {
  if (slot === 'breakfast') return settings.offerBreakfast;
  if (slot === 'lunch') return settings.offerLunch;
  return settings.offerDinner;
}

export function cycleMealCellStatus(current: MealCellStatus): MealCellStatus {
  if (current === null) return 'eating';
  if (current === 'eating') return 'skipping';
  return null;
}

export function mealSlotLabel(slot: MealSlot): string {
  if (slot === 'breakfast') return '조식';
  if (slot === 'lunch') return '중식';
  return '석식';
}

export function mealStatusLabel(status: MealCellStatus): string {
  if (status === 'eating') return '식사';
  if (status === 'skipping') return '미식사';
  return '미응답';
}

/** YYYY-MM-DD */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function startOfWeekMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function listDatesInRange(fromKey: string, toKey: string): string[] {
  const out: string[] = [];
  const cur = parseDateKey(fromKey);
  const end = parseDateKey(toKey);
  while (cur <= end) {
    out.push(toDateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function monthRange(anchor: Date): { from: string; to: string } {
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { from: toDateKey(from), to: toDateKey(to) };
}

export function weekRange(anchor: Date): { from: string; to: string } {
  const from = startOfWeekMonday(anchor);
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  return { from: toDateKey(from), to: toDateKey(to) };
}

export function dayRange(anchor: Date): { from: string; to: string } {
  const key = toDateKey(anchor);
  return { from: key, to: key };
}

export function aggregateDaySlots(
  memberCount: number,
  responses: Array<{ mealDate: string; mealSlot: MealSlot; status: MealResponseStatus }>,
  slots: MealSlot[],
  dates: string[]
): MealDayAggregate[] {
  const map = new Map<string, { eating: number; skipping: number }>();
  for (const r of responses) {
    const key = `${r.mealDate}|${r.mealSlot}`;
    const cur = map.get(key) ?? { eating: 0, skipping: 0 };
    if (r.status === 'eating') cur.eating += 1;
    else cur.skipping += 1;
    map.set(key, cur);
  }
  const out: MealDayAggregate[] = [];
  for (const mealDate of dates) {
    for (const mealSlot of slots) {
      const cur = map.get(`${mealDate}|${mealSlot}`) ?? { eating: 0, skipping: 0 };
      out.push({
        mealDate,
        mealSlot,
        eatingCount: cur.eating,
        skippingCount: cur.skipping,
        unsetCount: Math.max(0, memberCount - cur.eating - cur.skipping),
      });
    }
  }
  return out;
}

export function responseMapKey(mealDate: string, mealSlot: MealSlot): string {
  return `${mealDate}|${mealSlot}`;
}

function parseTimeHm(value: string): { h: number; m: number } {
  const [h, m] = value.split(':').map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

/** mealDate(YYYY-MM-DD) + 컷오프 시각·전일여부 → Date */
export function mealCutoffAt(
  mealDate: string,
  cutoffTime: string,
  prevDay: boolean
): Date {
  const [y, mo, d] = mealDate.split('-').map(Number);
  const base = new Date(y, (mo ?? 1) - 1, d ?? 1);
  if (prevDay) base.setDate(base.getDate() - 1);
  const { h, m } = parseTimeHm(cutoffTime);
  base.setHours(h, m, 0, 0);
  return base;
}

export function isMealSlotWritable(
  settings: MealSurveySettings,
  mealDate: string,
  mealSlot: MealSlot,
  now: Date = new Date()
): boolean {
  if (!isMealSlotOffered(settings, mealSlot)) return false;
  if (isCafeteriaClosedOn(settings, mealDate)) return false;
  let cutoffTime = settings.lunchCutoffTime;
  let prevDay = settings.lunchCutoffPrevDay;
  if (mealSlot === 'breakfast') {
    cutoffTime = settings.breakfastCutoffTime;
    prevDay = settings.breakfastCutoffPrevDay;
  } else if (mealSlot === 'dinner') {
    cutoffTime = settings.dinnerCutoffTime;
    prevDay = settings.dinnerCutoffPrevDay;
  }
  return now.getTime() < mealCutoffAt(mealDate, cutoffTime, prevDay).getTime();
}

/** 월간 달력 그리드(일~토). shared calendarMath 와 동일 규칙 */
export type MealCalendarDay = {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  weekday: WeekdayIndex;
  isClosed: boolean;
};

export function buildMealMonthGrid(
  settings: Pick<MealSurveySettings, 'closedWeekdays' | 'closedDates' | 'openDates'>,
  year: number,
  monthIndex: number
): MealCalendarDay[] {
  const todayKey = toDateKey(new Date());
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const startPad = first.getDay();
  const days: MealCalendarDay[] = [];

  const prevLast = new Date(year, monthIndex, 0).getDate();
  for (let i = startPad - 1; i >= 0; i -= 1) {
    const dayNum = prevLast - i;
    const d = new Date(year, monthIndex - 1, dayNum);
    const date = toDateKey(d);
    days.push({
      date,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: date === todayKey,
      weekday: d.getDay() as WeekdayIndex,
      isClosed: isCafeteriaClosedOn(settings, date),
    });
  }

  for (let dayNum = 1; dayNum <= last.getDate(); dayNum += 1) {
    const d = new Date(year, monthIndex, dayNum);
    const date = toDateKey(d);
    days.push({
      date,
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: date === todayKey,
      weekday: d.getDay() as WeekdayIndex,
      isClosed: isCafeteriaClosedOn(settings, date),
    });
  }

  const remaining = (7 - (days.length % 7)) % 7;
  for (let dayNum = 1; dayNum <= remaining; dayNum += 1) {
    const d = new Date(year, monthIndex + 1, dayNum);
    const date = toDateKey(d);
    days.push({
      date,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: date === todayKey,
      weekday: d.getDay() as WeekdayIndex,
      isClosed: isCafeteriaClosedOn(settings, date),
    });
  }

  return days;
}
