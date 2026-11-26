/**
 * Core Schedule / Reservation infrastructure
 *
 * ?? ??:
 * - Schedule: core.schedules ? ?? ?? ?? ?? ?? ??
 * - Reservation: core.reservations ? bookable ??? ?? ?? ??
 * - Booking: ?? ?? schedules (????/??). ?? ??? ??
 * - Session/Attendance: customer_sessions / attendance_sessions. ? barrel? ???? ??
 * - Availability / settings UI: Scheduling Capability SoT (`@/capabilities/scheduling`)
 */
export {
  APPOINTMENT_BOOKING_LEDGER,
  ATTENDANCE_CHECK_IN_LEDGER,
  bookingActLedger,
  CORE_DOMAIN_LEDGERS,
  isAppointmentBookingRow,
  isAttendanceCheckedIn,
  isBookableScheduleSlot,
  RESERVATION_LEDGER,
  RESOURCE_RESERVATION_LEDGER,
  SCHEDULE_LEDGER,
  SESSION_LEDGER,
  SLOT_RESERVATION_HOLDING_STATUSES,
} from './domainRoles';
export { CLASS_ATTENDANCE_LEDGER } from './classAttendanceLedger';
export { coreScheduleService } from './services/coreScheduleService';
export {
  applyReservationCommand,
  canApplyReservationCommand,
  RESERVATION_COMMANDS,
  RESERVATION_MACHINE,
  RESERVATION_STATES,
} from './reservationMachine';
export { reservationService, reservationService as scheduleReservationService } from './services/reservationService';
export { sessionPassService } from './sessionPassService';
export { updateBookingStatusAtomic } from './bookingPassAtomic';
export {
  filterBookingsByDate,
  filterBookingsForSlotWindow,
  selectUpcomingBookings,
} from './bookingQuery';
export {
  buildSlotOccupancyIndex,
  buildSlotKey,
  getSlotCapacityInfo,
} from './bookingCapacity';
export { ReservationInboxView } from './components/ReservationInboxView';
export { ConsultationQrModal } from './components/ConsultationQrModal';
export { CreateConsultationScheduleModal } from './components/CreateConsultationScheduleModal';
export * from './types';