// @ts-nocheck
import type { Booking } from '@/core/types/schedule';
import { ScheduleService } from '@/core/services/scheduleService';

/** 예약금 입금 확인 → 예약·입금 상태만 갱신 (수입 원장 연결 없음) */
export function confirmBookingDeposit(booking: Booking): {
  booking: Booking;
  income: null;
  createdIncome: false;
} {
  const updated = ScheduleService.saveBooking({
    ...booking,
    depositStatus: 'confirmed',
  });

  return { booking: updated, income: null, createdIncome: false };
}
