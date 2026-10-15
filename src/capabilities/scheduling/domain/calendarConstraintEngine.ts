/**
 * 3중 제약조건 실시간 검증 엔진 (Schedule Constraint Engine)
 *
 * 1. 직원 근무표 (shift_schedule): 휴무일, 근무시간 외, 브레이크 타임 충돌 검증
 * 2. 공간/장비 가용성 (seat_room): 동일 룸/타석 중복 배정(Double Booking) 방지
 * 3. 고객 이용권 (passes): 잔여 횟수 소진 및 유효기간 만료 슬롯 검증
 */

export interface StaffShiftConstraint {
  staffId: string;
  staffName?: string;
  date: string; // 'YYYY-MM-DD'
  workStart: string; // 'HH:mm'
  workEnd: string; // 'HH:mm'
  breakStart?: string; // 'HH:mm'
  breakEnd?: string; // 'HH:mm'
  isDayOff?: boolean;
}

export interface RoomConstraint {
  roomId: string;
  roomName: string;
  maxCapacity?: number;
}

export interface PassConstraint {
  passId: string;
  memberId: string;
  remainingCount: number;
  expiryDate: string; // 'YYYY-MM-DD'
  status: 'active' | 'expired' | 'exhausted' | 'suspended';
}

export interface BookingCandidate {
  bookingId?: string;
  memberId: string;
  staffId?: string;
  roomId?: string;
  date: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:mm'
  endTime: string; // 'HH:mm'
}

export interface ExistingBookingSlot {
  id: string;
  memberId: string;
  staffId?: string;
  roomId?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

export type ConstraintViolationType =
  | 'STAFF_DAY_OFF'
  | 'STAFF_OUTSIDE_HOURS'
  | 'STAFF_ON_BREAK'
  | 'STAFF_DOUBLE_BOOKED'
  | 'ROOM_DOUBLE_BOOKED'
  | 'PASS_EXPIRED'
  | 'PASS_EXHAUSTED'
  | 'PASS_NOT_FOUND';

export interface ConstraintViolation {
  type: ConstraintViolationType;
  message: string;
  severity: 'error' | 'warning';
  target: 'staff' | 'room' | 'pass';
}

export interface ConstraintValidationResult {
  isValid: boolean;
  violations: ConstraintViolation[];
}

/**
 * 'HH:mm' 문자열을 분 단위 정수로 변환
 */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * 두 시간 구간이 겹치는지 검사 (오픈 인터벌 [s1, e1) vs [s2, e2))
 */
export function isTimeOverlapping(s1: string, e1: string, s2: string, e2: string): boolean {
  const start1 = timeToMinutes(s1);
  const end1 = timeToMinutes(e1);
  const start2 = timeToMinutes(s2);
  const end2 = timeToMinutes(e2);
  return Math.max(start1, start2) < Math.min(end1, end2);
}

/**
 * 특정 날짜/시간 슬롯이 근무표 상 비활성(빗금) 상태인지 판정
 */
export function isSlotBlocked(
  timeSlot: string, // 'HH:mm'
  shift?: StaffShiftConstraint
): { isBlocked: boolean; reason?: string } {
  if (!shift) return { isBlocked: false };

  if (shift.isDayOff) {
    return { isBlocked: true, reason: '스태프 휴무일' };
  }

  const slotMin = timeToMinutes(timeSlot);
  const workStartMin = timeToMinutes(shift.workStart);
  const workEndMin = timeToMinutes(shift.workEnd);

  if (slotMin < workStartMin || slotMin >= workEndMin) {
    return { isBlocked: true, reason: '근무 시간 외' };
  }

  if (shift.breakStart && shift.breakEnd) {
    const breakStartMin = timeToMinutes(shift.breakStart);
    const breakEndMin = timeToMinutes(shift.breakEnd);
    if (slotMin >= breakStartMin && slotMin < breakEndMin) {
      return { isBlocked: true, reason: '휴게 시간' };
    }
  }

  return { isBlocked: false };
}

/**
 * 3중 제약조건(직원 근무표 + 공간 중복 + 고객 잔여권) 종합 검증
 */
export function validateScheduleConstraints(
  candidate: BookingCandidate,
  context: {
    staffShifts?: StaffShiftConstraint[];
    existingBookings?: ExistingBookingSlot[];
    memberPasses?: PassConstraint[];
    allowWarningPass?: boolean;
  }
): ConstraintValidationResult {
  const violations: ConstraintViolation[] = [];

  const {
    staffShifts = [],
    existingBookings = [],
    memberPasses = [],
    allowWarningPass = false,
  } = context;

  // 1. 직원 근무표 제약조건 검증 (staffId가 지정된 경우)
  if (candidate.staffId) {
    const shift = staffShifts.find(
      (s) => s.staffId === candidate.staffId && s.date === candidate.date
    );

    if (shift) {
      if (shift.isDayOff) {
        violations.push({
          type: 'STAFF_DAY_OFF',
          message: `${shift.staffName || '담당 직원'}의 휴무일에는 예약할 수 없습니다.`,
          severity: 'error',
          target: 'staff',
        });
      } else {
        const candStart = timeToMinutes(candidate.startTime);
        const candEnd = timeToMinutes(candidate.endTime);
        const workStart = timeToMinutes(shift.workStart);
        const workEnd = timeToMinutes(shift.workEnd);

        if (candStart < workStart || candEnd > workEnd) {
          violations.push({
            type: 'STAFF_OUTSIDE_HOURS',
            message: `근무 시간(${shift.workStart}~${shift.workEnd}) 외의 예약입니다.`,
            severity: 'error',
            target: 'staff',
          });
        }

        if (shift.breakStart && shift.breakEnd) {
          if (isTimeOverlapping(candidate.startTime, candidate.endTime, shift.breakStart, shift.breakEnd)) {
            violations.push({
              type: 'STAFF_ON_BREAK',
              message: `직원 휴게 시간(${shift.breakStart}~${shift.breakEnd})과 중복됩니다.`,
              severity: 'error',
              target: 'staff',
            });
          }
        }
      }
    }

    // 직원의 타 예약과의 중복 검증
    const staffConflicts = existingBookings.filter((b) => {
      if (b.id === candidate.bookingId) return false;
      if (b.status === 'cancelled') return false;
      if (b.staffId !== candidate.staffId) return false;
      if (b.date !== candidate.date) return false;
      return isTimeOverlapping(candidate.startTime, candidate.endTime, b.startTime, b.endTime);
    });

    if (staffConflicts.length > 0) {
      violations.push({
        type: 'STAFF_DOUBLE_BOOKED',
        message: '해당 직원의 다른 예약 시간과 중복됩니다.',
        severity: 'error',
        target: 'staff',
      });
    }
  }

  // 2. 공간/룸 가용성 제약조건 검증 (roomId가 지정된 경우)
  if (candidate.roomId) {
    const roomConflicts = existingBookings.filter((b) => {
      if (b.id === candidate.bookingId) return false;
      if (b.status === 'cancelled') return false;
      if (b.roomId !== candidate.roomId) return false;
      if (b.date !== candidate.date) return false;
      return isTimeOverlapping(candidate.startTime, candidate.endTime, b.startTime, b.endTime);
    });

    if (roomConflicts.length > 0) {
      violations.push({
        type: 'ROOM_DOUBLE_BOOKED',
        message: '해당 룸/타석에 이미 다른 예약이 배정되어 있습니다.',
        severity: 'error',
        target: 'room',
      });
    }
  }

  // 3. 고객 이용권/수강권 제약조건 검증
  if (candidate.memberId) {
    const activePasses = memberPasses.filter(
      (p) => p.memberId === candidate.memberId
    );

    if (activePasses.length === 0) {
      violations.push({
        type: 'PASS_NOT_FOUND',
        message: '고객에게 유효한 이용권/수강권이 없습니다.',
        severity: allowWarningPass ? 'warning' : 'error',
        target: 'pass',
      });
    } else {
      // 예약 일자 기준으로 만료일 및 잔여 횟수 검사
      const validPassForDate = activePasses.find((p) => {
        const notExpired = p.expiryDate >= candidate.date;
        const hasCount = p.remainingCount > 0;
        return notExpired && hasCount && p.status === 'active';
      });

      if (!validPassForDate) {
        const hasExpiredOnly = activePasses.some((p) => p.expiryDate < candidate.date);
        const hasExhaustedOnly = activePasses.some((p) => p.remainingCount <= 0);

        if (hasExpiredOnly) {
          violations.push({
            type: 'PASS_EXPIRED',
            message: `예약 일자(${candidate.date}) 기준 수강권 유효기간이 만료되었습니다.`,
            severity: 'error',
            target: 'pass',
          });
        } else if (hasExhaustedOnly) {
          violations.push({
            type: 'PASS_EXHAUSTED',
            message: '수강권 잔여 횟수가 0회입니다.',
            severity: 'error',
            target: 'pass',
          });
        }
      }
    }
  }

  const hasErrors = violations.some((v) => v.severity === 'error');

  return {
    isValid: !hasErrors,
    violations,
  };
}
