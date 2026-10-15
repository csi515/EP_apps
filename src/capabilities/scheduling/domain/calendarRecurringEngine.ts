/**
 * 반복 스케줄 엔진 (RRULE) 및 공휴일 자동 처리 / 대기자 승격
 *
 * 1. 규칙 기반 다중 슬롯 전개 (매주 화·목 3개월 반복, 12회차 패키지 등)
 * 2. 공휴일/휴관일 자동 건너뛰기 (skipHolidays 옵션 시 다음 주차로 자동 이월)
 * 3. 예약 취소 발생 시 대기자(Waitlist) 1순위 자동 승격 엔진
 */

export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type KoreanDayOfWeek = '월' | '화' | '수' | '목' | '금' | '토' | '일';

export const JS_DAY_TO_KOREAN: Record<number, KoreanDayOfWeek> = {
  0: '일',
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
};

export const KOREAN_DAY_TO_JS: Record<KoreanDayOfWeek, number> = {
  일: 0,
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
  토: 6,
};

export interface RecurringScheduleRule {
  frequency: RecurrenceFrequency;
  daysOfWeek?: KoreanDayOfWeek[]; // 주간 반복 시 (예: ['화', '목'])
  startDate: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:mm'
  endTime: string; // 'HH:mm'
  untilDate?: string; // 'YYYY-MM-DD'
  count?: number; // 총 회차 수 (예: 12회)
  skipHolidays?: boolean; // 공휴일 자동 건너뛰기 여부
}

export interface GeneratedScheduleSlot {
  sequenceNumber: number; // 회차 번호 (1, 2, 3...)
  date: string; // 'YYYY-MM-DD'
  dayOfWeek: KoreanDayOfWeek;
  startTime: string;
  endTime: string;
  isHolidaySkipped?: boolean;
  originalHolidayDate?: string;
}

export interface WaitlistEntry {
  waitlistId: string;
  bookingSlotId?: string;
  date: string;
  startTime: string;
  memberId: string;
  memberName: string;
  memberPhone?: string;
  requestedAt: string;
  priority: number; // 1순위, 2순위...
  status: 'active' | 'promoted' | 'cancelled' | 'expired';
}

export interface WaitlistPromotionResult {
  hasPromoted: boolean;
  promotedEntry?: WaitlistEntry;
  notificationMessage?: string;
}

/**
 * 'YYYY-MM-DD' 문자열을 Date 객체(로컬 타임 자정)로 파싱
 */
export function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Date 객체를 'YYYY-MM-DD' 포맷 문자열로 변환
 */
export function formatDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 날짜에 N일을 더한 새로운 Date 반환
 */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * 반복 스케줄 규칙에 따라 개별 일정 슬롯들을 전개(Materialize)
 */
export function expandRecurringSchedule(
  rule: RecurringScheduleRule,
  options?: {
    holidays?: string[]; // 'YYYY-MM-DD' 배열
    maxIterationsLimit?: number; // 무한루프 방지용 (기본 365)
  }
): GeneratedScheduleSlot[] {
  const holidays = new Set(options?.holidays || []);
  const maxIterations = options?.maxIterationsLimit || 365;

  const slots: GeneratedScheduleSlot[] = [];
  const targetCount = rule.count ?? Infinity;
  const untilDateStr = rule.untilDate ?? '9999-12-31';

  let current = parseDateOnly(rule.startDate);
  let iteration = 0;

  const validDays = rule.daysOfWeek && rule.daysOfWeek.length > 0
    ? new Set(rule.daysOfWeek)
    : null;

  while (slots.length < targetCount && iteration < maxIterations) {
    iteration++;
    const currentDateStr = formatDateIso(current);

    if (currentDateStr > untilDateStr) {
      break;
    }

    const currentDow = JS_DAY_TO_KOREAN[current.getDay()];

    // 요일 필터 검사
    let matchesDay = true;
    if (rule.frequency === 'weekly' || rule.frequency === 'biweekly') {
      if (validDays && !validDays.has(currentDow)) {
        matchesDay = false;
      }
    }

    if (matchesDay) {
      // 공휴일 스킵 처리
      const isHoliday = holidays.has(currentDateStr);
      if (isHoliday && rule.skipHolidays) {
        // 공휴일인 경우 이번 일자는 슬롯에 추가하지 않고 다음 날짜로 넘어감 (목표 count 유지를 위해)
      } else {
        slots.push({
          sequenceNumber: slots.length + 1,
          date: currentDateStr,
          dayOfWeek: currentDow,
          startTime: rule.startTime,
          endTime: rule.endTime,
        });
      }
    }

    // 다음 날짜로 전진
    if (rule.frequency === 'daily') {
      current = addDays(current, 1);
    } else if (rule.frequency === 'weekly') {
      current = addDays(current, 1);
    } else if (rule.frequency === 'biweekly') {
      current = addDays(current, 1);
    } else if (rule.frequency === 'monthly') {
      const nextMonth = new Date(current);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      current = nextMonth;
    }
  }

  return slots;
}

/**
 * 취소 발생 시 대기자(Waitlist) 1순위 자동 승격 엔진
 */
export function promoteNextWaitlist(
  slot: { date: string; startTime: string },
  waitlistEntries: WaitlistEntry[]
): WaitlistPromotionResult {
  // 해당 날짜 및 시간의 active 대기자 중 우선순위(priority 오름차순, 요청일자 오름차순) 정렬
  const candidates = waitlistEntries
    .filter((w) => w.date === slot.date && w.startTime === slot.startTime && w.status === 'active')
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.requestedAt.localeCompare(b.requestedAt);
    });

  if (candidates.length === 0) {
    return { hasPromoted: false };
  }

  const winner = candidates[0];
  const promotedEntry: WaitlistEntry = {
    ...winner,
    status: 'promoted',
  };

  const notificationMessage = `[예약 승격 안내] ${promotedEntry.memberName}님, ${slot.date} ${slot.startTime} 취소석이 발생하여 예약이 자동 확정되었습니다.`;

  return {
    hasPromoted: true,
    promotedEntry,
    notificationMessage,
  };
}
