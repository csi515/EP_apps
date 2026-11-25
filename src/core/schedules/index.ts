/**
 * Core Schedule / Reservation infrastructure
 *
 * Ï±ÖÏûÑ Í≤ΩÍ≥Ñ:
 * - Schedule: core.schedules ???àÏïΩ Í∞Ä???úÍ∞Ñ ?êÎäî ?¥ÏòÅ ?¨Î°Ø
 * - Reservation: core.reservations ??bookable ?¨Î°Ø???Ä??Í≥†Í∞ù ?†Ï≤≠
 * - Booking: Í≥†Í∞ù Î∞∞Ï†ï schedules ???ÑÎùº?åÏä§/?ºÎ?). ???åÏù¥Î∏??ÜÏùå
 * - Session/Attendance: customer_sessions / attendance_sessions. ??barrel???êÏû•???ÑÎãò
 * - Availability / slot capacity / settings UI: Scheduling Capability SoT.
 *   ??barrel??availability¬∑bookingCapacity export??deprecated shim
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
export { availabilityService } from './services/availabilityService';
export { materializeAvailabilitySlots } from './services/materializeAvailabilitySlots';
export { availabilityCapability } from '@/capabilities/scheduling/availability';
export { capacityCapability } from '@/capabilities/scheduling/capacity';
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
export { AvailabilitySettingsView } from './components/AvailabilitySettingsView';
export { ReservationInboxView } from './components/ReservationInboxView';
export { ConsultationQrModal } from './components/ConsultationQrModal';
export { CreateConsultationScheduleModal } from './components/CreateConsultationScheduleModal';
export * from './types';
export * from './types/availability';
