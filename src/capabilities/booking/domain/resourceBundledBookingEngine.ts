/**
 * 복합 자원(공간 + 강사 + 장비) 동시 점유 원자적 멀티락 및
 * 공간 블록 대여 & 정비/청소 버퍼 락(Turnaround Buffer Lock) 도메인 엔진 (Pure Functions)
 *
 * 대상:
 *  - 무인 공간/스튜디오/파티룸: 공간 단독 점유 + 앞뒤 N분 청소/환기 버퍼 시간 자동 점유 + 스마트 도어락 비밀번호 안내
 *  - 골프 아카데미: 타석(seat_room) + 레슨 프로(instructor_match)
 *  - 기구 필라테스: 리포머 룸(seat_room) + 전담 강사(instructor_match) + 소도구
 *  - 음악 합주실: 합주룸(seat_room) + 앰프/드럼 세트(rental_equipment)
 *  - 뷰티/헤어: 시술 체어(seat_room) + 디자이너(instructor_match)
 */

export interface TimeSlotRange {
  start: string; // HH:mm (e.g. "14:00")
  end: string; // HH:mm (e.g. "15:00")
}

export interface BundledResourceRequest {
  spaceId?: string;
  instructorId?: string;
  equipmentIds?: string[];
}

export interface ExistingOccupiedSlot {
  id: string;
  bookingDate: string; // YYYY-MM-DD
  timeRange: TimeSlotRange;
  spaceId?: string;
  instructorId?: string;
  equipmentIds?: string[];
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
}

export interface InstructorShiftSchedule {
  instructorId: string;
  date: string; // YYYY-MM-DD
  workingHours: TimeSlotRange;
  breakTimes?: TimeSlotRange[];
  dayOff?: boolean;
}

export interface EquipmentInventoryQuota {
  equipmentId: string;
  equipmentName: string;
  totalQuantity: number;
}

/** 공간 블록 대여 & 정비/청소 버퍼 설정 (Turnaround Config) */
export interface SpaceTurnaroundConfig {
  spaceId: string;
  spaceName?: string;
  bufferBeforeMinutes: number; // 입실 전 준비/환기 버퍼 (분, 기본 0)
  bufferAfterMinutes: number; // 퇴실 후 청소/소독/정비 버퍼 (분, 예: 15분, 30분)
  doorLockAutoPin?: boolean; // 스마트 도어락 핀번호 자동 생성
  doorLockPinFormat?: 'PHONE_LAST_4_STAR' | 'RANDOM_6_DIGIT';
  wifiSsid?: string;
  wifiPassword?: string;
  entryNoticeTemplate?: string;
}

export type ResourceLockConflictType =
  | 'SPACE_ALREADY_OCCUPIED'
  | 'SPACE_IN_TURNAROUND_BUFFER'
  | 'INSTRUCTOR_NOT_WORKING'
  | 'INSTRUCTOR_ON_BREAK'
  | 'INSTRUCTOR_ALREADY_BOOKED'
  | 'EQUIPMENT_OUT_OF_STOCK';

export interface ResourceLockValidationResult {
  canLock: boolean;
  conflicts: Array<{
    type: ResourceLockConflictType;
    resourceType: 'space' | 'instructor' | 'equipment';
    resourceId: string;
    message: string;
  }>;
}

/**
 * "HH:mm" 포맷 문자열에 분(minutes)을 가감 (순수 함수)
 */
export function addMinutesToTimeString(timeStr: string, minutes: number): string {
  const [hStr, mStr] = timeStr.split(':');
  const totalMin = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + minutes;
  const clampedMin = Math.max(0, Math.min(23 * 60 + 59, totalMin));
  const newH = Math.floor(clampedMin / 60);
  const newM = clampedMin % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/**
 * 두 시간 구간이 겹치는지 판정 (순수 함수)
 */
export function isTimeRangeOverlapping(rangeA: TimeSlotRange, rangeB: TimeSlotRange): boolean {
  return rangeA.start < rangeB.end && rangeA.end > rangeB.start;
}

/**
 * 대상 시간대가 근무 시간대 내에 온전히 포함되는지 판정
 */
export function isWithinWorkingHours(target: TimeSlotRange, working: TimeSlotRange): boolean {
  return target.start >= working.start && target.end <= working.end;
}

/**
 * 복합 자원 동시 점유 및 정비 버퍼 락 검증 엔진 (Multi-Resource & Buffer Lock Validator)
 */
export function validateResourceBundledBooking(params: {
  bookingDate: string; // YYYY-MM-DD
  timeRange: TimeSlotRange;
  requestedResources: BundledResourceRequest;
  existingBookings: readonly ExistingOccupiedSlot[];
  instructorSchedules?: readonly InstructorShiftSchedule[];
  equipmentQuotas?: readonly EquipmentInventoryQuota[];
  spaceTurnaroundConfigs?: readonly SpaceTurnaroundConfig[];
}): ResourceLockValidationResult {
  const {
    bookingDate,
    timeRange,
    requestedResources,
    existingBookings,
    instructorSchedules = [],
    equipmentQuotas = [],
    spaceTurnaroundConfigs = [],
  } = params;

  const conflicts: ResourceLockValidationResult['conflicts'] = [];

  // 동일 일자의 유효(확정/대기) 예약들만 필터링
  const activeBookingsSameDay = existingBookings.filter(
    (b) => b.bookingDate === bookingDate && b.status !== 'CANCELLED'
  );

  // 1. 공간(Space/Room) 점유 및 정비 버퍼(Turnaround Buffer) 검사
  if (requestedResources.spaceId) {
    const spaceId = requestedResources.spaceId;
    const spaceConfig = spaceTurnaroundConfigs.find((c) => c.spaceId === spaceId);
    const bufferBefore = spaceConfig?.bufferBeforeMinutes || 0;
    const bufferAfter = spaceConfig?.bufferAfterMinutes || 0;

    // 요청된 예약의 버퍼 포함 전체 점유 구간
    const requestBufferedRange: TimeSlotRange = {
      start: addMinutesToTimeString(timeRange.start, -bufferBefore),
      end: addMinutesToTimeString(timeRange.end, bufferAfter),
    };

    const sameSpaceBookings = activeBookingsSameDay.filter((b) => b.spaceId === spaceId);

    for (const b of sameSpaceBookings) {
      // 1-1. 순수 이용 시간대가 겹치는 경우
      if (isTimeRangeOverlapping(b.timeRange, timeRange)) {
        conflicts.push({
          type: 'SPACE_ALREADY_OCCUPIED',
          resourceType: 'space',
          resourceId: spaceId,
          message: `해당 시간대에 공간(룸/좌석)이 이미 예약되어 있습니다.`,
        });
        break;
      }

      // 1-2. 정비 버퍼(청소/환기) 시간과 겹치는 경우
      const existingBufferedRange: TimeSlotRange = {
        start: addMinutesToTimeString(b.timeRange.start, -bufferBefore),
        end: addMinutesToTimeString(b.timeRange.end, bufferAfter),
      };

      if (isTimeRangeOverlapping(requestBufferedRange, existingBufferedRange)) {
        conflicts.push({
          type: 'SPACE_IN_TURNAROUND_BUFFER',
          resourceType: 'space',
          resourceId: spaceId,
          message: `해당 공간은 이전/이후 예약의 정비·청소 버퍼 시간(${bufferAfter}분)과 겹쳐 예약할 수 없습니다.`,
        });
        break;
      }
    }
  }

  // 동시간대에 걸치는 기존 예약들 (강사 및 장비용)
  const overlappingBookings = activeBookingsSameDay.filter((b) =>
    isTimeRangeOverlapping(b.timeRange, timeRange)
  );

  // 2. 강사/시술자(Instructor) 충돌 검사
  if (requestedResources.instructorId) {
    const instructorId = requestedResources.instructorId;

    // 2-1. 강사 스케줄/근무표 검증
    const schedule = instructorSchedules.find(
      (s) => s.instructorId === instructorId && s.date === bookingDate
    );

    if (schedule) {
      if (schedule.dayOff) {
        conflicts.push({
          type: 'INSTRUCTOR_NOT_WORKING',
          resourceType: 'instructor',
          resourceId: instructorId,
          message: '담당 강사의 휴무일입니다.',
        });
      } else if (!isWithinWorkingHours(timeRange, schedule.workingHours)) {
        conflicts.push({
          type: 'INSTRUCTOR_NOT_WORKING',
          resourceType: 'instructor',
          resourceId: instructorId,
          message: `강사 근무 시간(${schedule.workingHours.start}~${schedule.workingHours.end}) 외의 예약입니다.`,
        });
      }

      // 브레이크 타임 검사
      if (schedule.breakTimes && schedule.breakTimes.length > 0) {
        const breakConflict = schedule.breakTimes.some((bt) =>
          isTimeRangeOverlapping(timeRange, bt)
        );
        if (breakConflict) {
          conflicts.push({
            type: 'INSTRUCTOR_ON_BREAK',
            resourceType: 'instructor',
            resourceId: instructorId,
            message: '담당 강사의 휴게(브레이크) 시간과 겹칩니다.',
          });
        }
      }
    }

    // 2-2. 강사 타 예약 중복 배정 검증
    const instructorConflict = overlappingBookings.find(
      (b) => b.instructorId === instructorId
    );
    if (instructorConflict) {
      conflicts.push({
        type: 'INSTRUCTOR_ALREADY_BOOKED',
        resourceType: 'instructor',
        resourceId: instructorId,
        message: '해당 강사에게 동시간대 다른 예약이 이미 배정되어 있습니다.',
      });
    }
  }

  // 3. 장비(Equipment) 가용 수량(재고 한도) 검사
  if (requestedResources.equipmentIds && requestedResources.equipmentIds.length > 0) {
    for (const eqId of requestedResources.equipmentIds) {
      const quota = equipmentQuotas.find((q) => q.equipmentId === eqId);
      if (quota) {
        const currentlyOccupiedCount = overlappingBookings.filter(
          (b) => b.equipmentIds && b.equipmentIds.includes(eqId)
        ).length;

        if (currentlyOccupiedCount + 1 > quota.totalQuantity) {
          conflicts.push({
            type: 'EQUIPMENT_OUT_OF_STOCK',
            resourceType: 'equipment',
            resourceId: eqId,
            message: `장비 [${quota.equipmentName}]의 동시간 가용 수량(${quota.totalQuantity}대)이 모두 소진되었습니다.`,
          });
        }
      }
    }
  }

  return {
    canLock: conflicts.length === 0,
    conflicts,
  };
}

/** 무인 공간 안내 서식 출력 규격 */
export interface UnattendedEntryGuide {
  bookingId: string;
  spaceName: string;
  bookingDate: string;
  timeRange: TimeSlotRange;
  doorLockPin: string;
  wifiInfo?: string;
  guideMessage: string;
}

/**
 * 4. 무인 공간 입실 안내 서식 생성기 (비용 0원 원칙)
 *    도어락 비밀번호 및 이용 수칙을 고객 카카오톡/문자/인앱 알림용으로 자동 조립
 */
export function generateUnattendedEntryGuide(params: {
  bookingId: string;
  customerName: string;
  customerPhone?: string;
  spaceName: string;
  bookingDate: string;
  timeRange: TimeSlotRange;
  config?: SpaceTurnaroundConfig;
}): UnattendedEntryGuide {
  const {
    bookingId,
    customerName,
    customerPhone = '010-0000-0000',
    spaceName,
    bookingDate,
    timeRange,
    config,
  } = params;

  // 도어락 핀번호 결정 (전화번호 뒷 4자리 + '*' 또는 일회용 6자리)
  let doorLockPin = '1234*';
  if (config?.doorLockPinFormat === 'RANDOM_6_DIGIT') {
    doorLockPin = `${Math.floor(100000 + Math.random() * 900000)}#`;
  } else {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const last4 = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : '0000';
    doorLockPin = `${last4}*`;
  }

  const wifiText = config?.wifiSsid
    ? `📶 와이파이: SSID [${config.wifiSsid}] / PW [${config.wifiPassword || '없음'}]`
    : undefined;

  const defaultNotice =
    config?.entryNoticeTemplate ||
    `[무인 공간 이용 수칙]\n` +
    `1. 입실 전 도어락에 위 비밀번호를 입력해주세요.\n` +
    `2. 다음 이용자를 위한 청소/정비 버퍼 시간 준수를 위해 퇴실 5분 전 정리정돈을 부탁드립니다.\n` +
    `3. 퇴실 시 전등 및 냉난방기 전원을 끄고 문을 닫아주세요.`;

  const guideMessage =
    `[${spaceName}] 예약 및 입실 안내\n\n` +
    `안녕하세요, ${customerName}님!\n` +
    `예약하신 공간 입실 정보를 안내해 드립니다.\n\n` +
    `■ 일시: ${bookingDate} ${timeRange.start} ~ ${timeRange.end}\n` +
    `■ 공간: ${spaceName}\n` +
    `■ 도어락 비밀번호: [ ${doorLockPin} ]\n` +
    (wifiText ? `■ ${wifiText}\n\n` : `\n`) +
    `${defaultNotice}`;

  return {
    bookingId,
    spaceName,
    bookingDate,
    timeRange,
    doorLockPin,
    wifiInfo: wifiText,
    guideMessage,
  };
}
