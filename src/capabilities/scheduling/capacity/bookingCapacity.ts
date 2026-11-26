/** Scheduling Capability — Core `bookingCapacity` 재export (SoT: core.schedules). */
export {
  UNASSIGNED_STAFF_TOKEN,
  normalizeStaffId,
  buildSlotKey,
  isActiveBookingStatus,
  buildSlotOccupancyIndex,
  groupBookingsIntoSlots,
  findActiveMemberInSlot,
  countSlotOccupancy,
  getSlotCapacityInfo,
} from '@/core/schedules/bookingCapacity';
export type { SlotBookingGroup, SlotCapacityInfo } from '@/core/schedules/bookingCapacity';