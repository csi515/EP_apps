/**
 * Schedule / Reservation / Session / Attendance 책임 경계.
 * 실행: npm run test:domain-roles
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEDULE_HOLDING_STATUSES } from '@/core/capacity/types';
import {
  APPOINTMENT_BOOKING_LEDGER,
  ATTENDANCE_CHECK_IN_LEDGER,
  bookingActLedger,
  CORE_DOMAIN_LEDGERS,
  DOMAIN_MODELS,
  isAppointmentBookingRow,
  isAttendanceCheckedIn,
  isBookableScheduleSlot,
  RESERVATION_LEDGER,
  RESOURCE_RESERVATION_LEDGER,
  SCHEDULE_LEDGER,
  SESSION_LEDGER,
  SESSION_PASS_TABLE,
  shouldMirrorStatusAcrossLedgers,
  SLOT_RESERVATION_HOLDING_STATUSES,
} from './domainRoles';
import { CLASS_ATTENDANCE_LEDGER } from './classAttendanceLedger';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

function readRel(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function run() {
  assert.deepEqual([...DOMAIN_MODELS], ['schedule', 'reservation', 'session', 'attendance']);
  assert.equal(SCHEDULE_LEDGER.table, 'core.schedules');
  assert.equal(RESERVATION_LEDGER.table, 'core.reservations');
  assert.equal(APPOINTMENT_BOOKING_LEDGER.table, 'core.schedules');
  assert.equal(SESSION_LEDGER.table, 'core.customer_sessions');
  assert.equal(ATTENDANCE_CHECK_IN_LEDGER.table, 'core.attendance_sessions');
  assert.equal(ATTENDANCE_CHECK_IN_LEDGER.statusField, 'check_in_at');
  assert.equal(CLASS_ATTENDANCE_LEDGER.table, 'piano.attendance');
  assert.equal(RESOURCE_RESERVATION_LEDGER.table, 'core.room_reservations');
  assert.equal(SESSION_PASS_TABLE, 'core.session_passes');
  assert.equal(shouldMirrorStatusAcrossLedgers(), false);

  assert.equal(isBookableScheduleSlot({ is_bookable: true }), true);
  assert.equal(isAppointmentBookingRow({ is_bookable: true, customer_id: 'c1' }), false);
  assert.equal(isAppointmentBookingRow({ is_bookable: false, customer_id: 'c1' }), true);
  assert.equal(bookingActLedger({ is_bookable: true }), 'core.reservations');
  assert.equal(bookingActLedger({ customerId: 'c1' }), 'core.schedules');
  assert.equal(isAttendanceCheckedIn({ checkInAt: '2026-09-24T01:00:00Z' }), true);
  assert.equal(isAttendanceCheckedIn({ check_in_at: null }), false);

  assert.deepEqual([...SLOT_RESERVATION_HOLDING_STATUSES], ['requested', 'confirmed']);
  assert.deepEqual([...SCHEDULE_HOLDING_STATUSES], [...SLOT_RESERVATION_HOLDING_STATUSES]);

  const slotLedger = bookingActLedger({ is_bookable: true });
  assert.notEqual(slotLedger, SCHEDULE_LEDGER.table + '.status');
  assert.ok(!SCHEDULE_LEDGER.doesNotOwn.includes('bookable_or_operating_slot'));
  assert.ok(SESSION_LEDGER.doesNotOwn.includes('booking_status'));
  assert.ok(ATTENDANCE_CHECK_IN_LEDGER.doesNotOwn.includes('class_attendance'));
  assert.ok(CORE_DOMAIN_LEDGERS.every((ledger) => ledger.table.startsWith('core.')));

  const reservationService = readRel('src/core/schedules/services/reservationService.ts');
  assert.match(reservationService, /core\.reservations/);
  assert.match(reservationService, /bookable Schedule/);

  const scheduleService = readRel('src/core/services/scheduleService.ts');
  assert.match(scheduleService, /appointment Booking/);
  assert.match(scheduleService, /core\.reservations/);

  const attendanceTypes = readRel('src/capabilities/attendance/domain/types.ts').replace(/\r/g, '');
  assert.match(attendanceTypes, /AttendanceCheckIn/);
  assert.match(attendanceTypes, /core\.attendance_sessions/);
  assert.doesNotMatch(attendanceTypes, /customer_sessions/);

  const sessionTypes = readRel('src/core/sessions/types.ts');
  assert.match(sessionTypes, /core\.customer_sessions/);
  assert.match(sessionTypes, /room_reservations/);
  assert.match(sessionTypes, /차감하지 않는다/);

  const bookingTypes = readRel('src/core/types/schedule.ts');
  assert.match(bookingTypes, /core\.schedules/);
  assert.match(bookingTypes, /Session\(방문 사실\)이 아니다/);

  console.log('domain-roles ok');
}

run();
