import assert from 'node:assert/strict';
import {
  validateResourceBundledBooking,
  generateUnattendedEntryGuide,
  type ExistingOccupiedSlot,
  type InstructorShiftSchedule,
  type EquipmentInventoryQuota,
  type SpaceTurnaroundConfig,
} from './resourceBundledBookingEngine';

function run() {
  const existingBookings: ExistingOccupiedSlot[] = [
    {
      id: 'b-1',
      bookingDate: '2026-10-20',
      timeRange: { start: '14:00', end: '15:00' },
      spaceId: 'room-reformer-1',
      instructorId: 'inst-kim',
      equipmentIds: ['eq-mat', 'eq-reformer'],
      status: 'CONFIRMED',
    },
    {
      id: 'b-party-1',
      bookingDate: '2026-10-20',
      timeRange: { start: '14:00', end: '15:00' },
      spaceId: 'room-party-1',
      status: 'CONFIRMED',
    },
  ];

  const instructorSchedules: InstructorShiftSchedule[] = [
    {
      instructorId: 'inst-kim',
      date: '2026-10-20',
      workingHours: { start: '10:00', end: '19:00' },
      breakTimes: [{ start: '12:00', end: '13:00' }],
    },
    {
      instructorId: 'inst-lee',
      date: '2026-10-20',
      workingHours: { start: '13:00', end: '21:00' },
      dayOff: true, // 휴무일
    },
  ];

  const equipmentQuotas: EquipmentInventoryQuota[] = [
    {
      equipmentId: 'eq-reformer',
      equipmentName: '필라테스 리포머',
      totalQuantity: 1, // 총 1대 보유
    },
    {
      equipmentId: 'eq-mat',
      equipmentName: '요가 매트',
      totalQuantity: 10, // 총 10장 보유
    },
  ];

  const spaceTurnaroundConfigs: SpaceTurnaroundConfig[] = [
    {
      spaceId: 'room-party-1',
      spaceName: '프리미엄 파티룸 A',
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 15, // 퇴실 후 15분 환기/청소 버퍼
      doorLockAutoPin: true,
      doorLockPinFormat: 'PHONE_LAST_4_STAR',
      wifiSsid: 'PARTY_ROOM_A_5G',
      wifiPassword: 'moa-welcome-pw',
    },
  ];

  // 1. 성공 시나리오: 비어있는 시간대, 근무 중인 강사, 충분한 장비
  const successResult = validateResourceBundledBooking({
    bookingDate: '2026-10-20',
    timeRange: { start: '15:00', end: '16:00' },
    requestedResources: {
      spaceId: 'room-reformer-1',
      instructorId: 'inst-kim',
      equipmentIds: ['eq-reformer', 'eq-mat'],
    },
    existingBookings,
    instructorSchedules,
    equipmentQuotas,
  });
  assert.equal(successResult.canLock, true);
  assert.equal(successResult.conflicts.length, 0);

  // 2. 공간 충돌 시나리오: 이미 14:00~15:00에 room-reformer-1 점유됨
  const spaceConflictResult = validateResourceBundledBooking({
    bookingDate: '2026-10-20',
    timeRange: { start: '14:30', end: '15:30' },
    requestedResources: {
      spaceId: 'room-reformer-1',
    },
    existingBookings,
  });
  assert.equal(spaceConflictResult.canLock, false);
  assert.equal(spaceConflictResult.conflicts[0].type, 'SPACE_ALREADY_OCCUPIED');

  // 3. 강사 휴무일 충돌
  const dayOffResult = validateResourceBundledBooking({
    bookingDate: '2026-10-20',
    timeRange: { start: '15:00', end: '16:00' },
    requestedResources: {
      instructorId: 'inst-lee',
    },
    existingBookings,
    instructorSchedules,
  });
  assert.equal(dayOffResult.canLock, false);
  assert.equal(dayOffResult.conflicts[0].type, 'INSTRUCTOR_NOT_WORKING');

  // 4. 강사 브레이크 타임 충돌
  const breakConflictResult = validateResourceBundledBooking({
    bookingDate: '2026-10-20',
    timeRange: { start: '12:30', end: '13:30' },
    requestedResources: {
      instructorId: 'inst-kim',
    },
    existingBookings,
    instructorSchedules,
  });
  assert.equal(breakConflictResult.canLock, false);
  assert.equal(breakConflictResult.conflicts[0].type, 'INSTRUCTOR_ON_BREAK');

  // 5. 장비 수량 초과 충돌 (리포머 1대 보유인데 14:00~15:00에 이미 대여 중)
  const equipmentConflictResult = validateResourceBundledBooking({
    bookingDate: '2026-10-20',
    timeRange: { start: '14:15', end: '14:45' },
    requestedResources: {
      spaceId: 'room-reformer-2',
      equipmentIds: ['eq-reformer'],
    },
    existingBookings,
    equipmentQuotas,
  });
  assert.equal(equipmentConflictResult.canLock, false);
  assert.equal(equipmentConflictResult.conflicts[0].type, 'EQUIPMENT_OUT_OF_STOCK');

  // 6. 공간 정비/청소 버퍼(Turnaround Buffer Lock) 충돌 검증
  // 기존 예약: 14:00 ~ 15:00, 버퍼 15분 -> 점유 종료: 15:15
  // 시도 예약: 15:05 ~ 16:00 -> 15:00~15:15 청소 시간과 겹침!
  const bufferConflictResult = validateResourceBundledBooking({
    bookingDate: '2026-10-20',
    timeRange: { start: '15:05', end: '16:00' },
    requestedResources: {
      spaceId: 'room-party-1',
    },
    existingBookings,
    spaceTurnaroundConfigs,
  });
  assert.equal(bufferConflictResult.canLock, false);
  assert.equal(bufferConflictResult.conflicts[0].type, 'SPACE_IN_TURNAROUND_BUFFER');

  // 7. 정비 버퍼 통과 검증 (15:15 이후 시작 예약: 15:20 ~ 16:20)
  const bufferPassResult = validateResourceBundledBooking({
    bookingDate: '2026-10-20',
    timeRange: { start: '15:20', end: '16:20' },
    requestedResources: {
      spaceId: 'room-party-1',
    },
    existingBookings,
    spaceTurnaroundConfigs,
  });
  assert.equal(bufferPassResult.canLock, true);
  assert.equal(bufferPassResult.conflicts.length, 0);

  // 8. 무인 공간 입실 안내(도어락 비밀번호/이용수칙) 서식 생성기 검증
  const guide = generateUnattendedEntryGuide({
    bookingId: 'book-999',
    customerName: '박지수',
    customerPhone: '010-9876-5432',
    spaceName: '프리미엄 파티룸 A',
    bookingDate: '2026-10-20',
    timeRange: { start: '15:20', end: '18:20' },
    config: spaceTurnaroundConfigs[0],
  });
  assert.equal(guide.doorLockPin, '5432*');
  assert.ok(guide.wifiInfo?.includes('PARTY_ROOM_A_5G'));
  assert.ok(guide.guideMessage.includes('5432*'));
  assert.ok(guide.guideMessage.includes('청소/정비 버퍼 시간 준수'));

  console.log('resourceBundledBookingEngine.test.ts: ok');
}

run();
