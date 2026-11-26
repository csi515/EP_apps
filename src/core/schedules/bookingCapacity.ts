import { computeCapacitySnapshot } from './capacityMath';
import type { Booking, BookingStatus, ServiceOffering, SlotRecruitment } from '@/core/types/schedule';

const ACTIVE_STATUSES: BookingStatus[] = ['scheduled', 'confirmed', 'completed', 'no_show'];

/** ??? ?? ?? ? ?? */
export const UNASSIGNED_STAFF_TOKEN = '_unassigned_';

export function normalizeStaffId(staffId?: string | null): string {
  return staffId?.trim() ? staffId.trim() : UNASSIGNED_STAFF_TOKEN;
}

/**
 * ?? ?? + ?? ?? + ?? ?? ?? = ??? ?? ??.
 * ??? ??? ?? ????? ?? ????? ??·?? ??.
 */
export function buildSlotKey(serviceId: string, staffId: string | null | undefined, startsAt: string): string {
  return `${serviceId}|${normalizeStaffId(staffId)}|${startsAt}`;
}

export function isActiveBookingStatus(status: BookingStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/**
 * ??(?? ??) ??? ??? ?? — ??? ?? ? O(??)×O(??) ?? ??.
 */
export function buildSlotOccupancyIndex(bookings: readonly Booking[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const booking of bookings) {
    if (!booking.serviceId || booking.waitlist) continue;
    if (!isActiveBookingStatus(booking.status)) continue;
    const key = buildSlotKey(booking.serviceId, booking.staffId, booking.startsAt);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export interface SlotBookingGroup {
  key: string;
  serviceId: string;
  staffId: string;
  startsAt: string;
  serviceName: string;
  staffName: string;
  endsAt: string;
  bookings: Booking[];
}

/** ?? ??·??·???? ??? ? ???? ???. ??·??? ??? ?? ??? ??. */
export function groupBookingsIntoSlots(bookings: Booking[]): SlotBookingGroup[] {
  const groups = new Map<string, SlotBookingGroup>();
  for (const booking of bookings) {
    const key =
      booking.serviceId && booking.staffId
        ? buildSlotKey(booking.serviceId, booking.staffId, booking.startsAt)
        : `booking|${booking.id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.bookings.push(booking);
      continue;
    }
    groups.set(key, {
      key,
      serviceId: booking.serviceId || '',
      staffId: booking.staffId || '',
      startsAt: booking.startsAt,
      serviceName: booking.serviceName || '',
      staffName: booking.staffName || '',
      endsAt: booking.endsAt,
      bookings: [booking],
    });
  }
  return [...groups.values()];
}

/** ??? ??? ??? ?? ??? ??, ?? ??? ?? ??? ???. */
export function findActiveMemberInSlot(
  bookings: Booking[],
  customerId: string,
  serviceId: string,
  staffId: string | null | undefined,
  startsAt: string
): Booking | undefined {
  const staffToken = normalizeStaffId(staffId);
  return bookings.find(
    (booking) =>
      booking.customerId === customerId &&
      booking.serviceId === serviceId &&
      booking.startsAt === startsAt &&
      normalizeStaffId(booking.staffId) === staffToken &&
      booking.status !== 'cancelled' &&
      !booking.waitlist
  );
}

export function countSlotOccupancy(
  bookings: Booking[],
  serviceId: string,
  staffId: string | null | undefined,
  startsAt: string
): number {
  const staffToken = normalizeStaffId(staffId);
  return bookings.filter((b) => {
    if (b.serviceId !== serviceId || b.startsAt !== startsAt) return false;
    if (b.waitlist) return false;
    if (!isActiveBookingStatus(b.status)) return false;
    return normalizeStaffId(b.staffId) === staffToken;
  }).length;
}

export interface SlotCapacityInfo {
  slotKey: string;
  serviceId: string;
  staffId: string;
  startsAt: string;
  occupied: number;
  maxCapacity: number;
  remaining: number;
  closedManually: boolean;
  /** ?? ?? ?? ?? ?? */
  isClosed: boolean;
}

export function getSlotCapacityInfo(params: {
  service: ServiceOffering;
  staffId?: string | null;
  startsAt: string;
  bookings: Booking[];
  recruitments?: SlotRecruitment[];
  /** buildSlotOccupancyIndex ?? — ??? bookings ?? ??? ?? */
  occupancyIndex?: Map<string, number>;
}): SlotCapacityInfo {
  const { service, staffId, startsAt, bookings, recruitments = [], occupancyIndex } = params;
  const normalizedStaffId = normalizeStaffId(staffId);
  const slotKey = buildSlotKey(service.id, normalizedStaffId, startsAt);
  const occupied =
    occupancyIndex?.get(slotKey) ??
    countSlotOccupancy(bookings, service.id, normalizedStaffId, startsAt);
  const recruitment = recruitments.find((r) => {
    const key =
      r.id.includes('|') && r.id.split('|').length >= 3
        ? r.id
        : buildSlotKey(r.serviceId, r.staffId ?? UNASSIGNED_STAFF_TOKEN, r.startsAt);
    return key === slotKey;
  });
  const snapshot = computeCapacitySnapshot({
    capacity: recruitment?.maxCapacity || service.maxCapacity || 1,
    booked: occupied,
  });
  const closedManually = recruitment?.closedManually === true;

  return {
    slotKey,
    serviceId: service.id,
    staffId: normalizedStaffId,
    startsAt,
    occupied: snapshot.booked,
    maxCapacity: snapshot.capacity,
    remaining: snapshot.available,
    closedManually,
    isClosed: closedManually || snapshot.isFull,
  };
}