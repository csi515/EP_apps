import { createTurnaroundFromBooking } from '@/core/organizations/services/opsPersistenceService';
import { readOpsRuntimeSettings } from '@/core/capabilities/opsRuntimeSettings';

/** 예약 종료/퇴실 시 공간 턴어라운드 행을 생성한다. */
export async function enqueueTurnaroundAfterBookingEnd(input: {
  organizationId: string;
  roomId: string;
  roomName: string;
  bookingId: string;
  serviceStartAt: string;
  serviceEndAt: string;
  organizationSettings?: Record<string, unknown> | null;
  departmentId?: string | null;
}): Promise<string> {
  const runtime = readOpsRuntimeSettings(input.organizationSettings);
  const bufferMinutes = runtime.turnaround_buffer_minutes ?? 15;
  return createTurnaroundFromBooking({
    organizationId: input.organizationId,
    roomId: input.roomId,
    roomName: input.roomName,
    bookingId: input.bookingId,
    serviceStartAt: input.serviceStartAt,
    serviceEndAt: input.serviceEndAt,
    bufferMinutes,
    departmentId: input.departmentId,
  });
}
