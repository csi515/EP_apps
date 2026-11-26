import {
  SLOT_RESERVATION_CONFIRMED_STATUSES,
  SLOT_RESERVATION_HOLDING_STATUSES,
} from './domainRoles';

/** 업종 무관 정원 스냅샷. */
export type CapacitySnapshot = {
  capacity: number;
  booked: number;
  available: number;
  isFull: boolean;
};

export const RESERVATION_HOLDING_STATUSES = SLOT_RESERVATION_HOLDING_STATUSES;
export const RESERVATION_CONFIRMED_STATUSES = SLOT_RESERVATION_CONFIRMED_STATUSES;

/** @deprecated 이름 호환. 실제 값은 Reservation 점유 상태. */
export const SCHEDULE_HOLDING_STATUSES = RESERVATION_HOLDING_STATUSES;

/** @deprecated 이름 호환. */
export const SCHEDULE_CONFIRMED_STATUSES = RESERVATION_CONFIRMED_STATUSES;

export type ScheduleHoldingStatus = (typeof RESERVATION_HOLDING_STATUSES)[number];
export type ReservationHoldingStatus = ScheduleHoldingStatus;