/**
 * Moa-v2 Core Standard Domain Events.
 * Capability 간 상호작용에 사용되는 표준 이벤트 이름 상수 및 페이로드 계약(Contract).
 * Core는 Capability 구체 구현을 import하지 않고 순수 DTO 규격만 선언한다.
 */

export const DOMAIN_EVENT_NAMES = {
  // 출석 (Attendance)
  ATTENDANCE_CHECKED_IN: 'attendance.checked_in',
  ATTENDANCE_CHECKED_OUT: 'attendance.checked_out',
  ATTENDANCE_NO_SHOW: 'attendance.no_show',

  // 수강권 및 회원권 (Passes)
  PASS_DEDUCT_REQUESTED: 'passes.deduct_requested',
  PASS_DEDUCTED: 'passes.deducted',
  PASS_LOW_BALANCE: 'passes.low_balance',
  PASS_EXHAUSTED: 'passes.exhausted',
  PASS_EXPIRED: 'passes.expired',

  // 예약 (Booking)
  BOOKING_RESERVED: 'booking.reserved',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_COMPLETED: 'booking.completed',

  // 상담 CRM (Consultation)
  CONSULTATION_CREATED: 'consultation.created',
  CONSULTATION_COMPLETED: 'consultation.completed',

  // 리텐션 및 마케팅 (Retention Marketing)
  RETENTION_TRIGGER_CAMPAIGN: 'retention.trigger_campaign',
  RETENTION_NOTIFICATION_SENT: 'retention.notification_sent',

  // 고객 및 신원 (Customer)
  CUSTOMER_REGISTERED: 'customer.registered',
  CUSTOMER_TRANSFERRED: 'customer.transferred',
} as const;

export type DomainEventName = (typeof DOMAIN_EVENT_NAMES)[keyof typeof DOMAIN_EVENT_NAMES];

// ==========================================
// Payloads
// ==========================================

export interface AttendanceCheckedInPayload {
  attendanceId: string;
  studentId: string;
  studentName?: string;
  programId?: string;
  programName?: string;
  checkInTime: string;
  passId?: string;
  instructorId?: string;
  locationId?: string;
}

export interface AttendanceCheckedOutPayload {
  attendanceId: string;
  studentId: string;
  checkOutTime: string;
  durationMinutes?: number;
}

export interface PassDeductRequestedPayload {
  passId?: string;
  studentId: string;
  count: number;
  reason: string;
  triggerEventId?: string;
  metadata?: Record<string, unknown>;
}

export interface PassDeductedPayload {
  passId: string;
  studentId: string;
  deductedCount: number;
  remainingCount: number;
  passType: 'COUNT_BASED' | 'PERIOD_BASED' | 'HYBRID';
  isExhausted: boolean;
}

export interface PassLowBalancePayload {
  passId: string;
  studentId: string;
  studentName?: string;
  remainingCount: number;
  threshold: number;
}

export interface PassExhaustedPayload {
  passId: string;
  studentId: string;
  studentName?: string;
  exhaustedAt: string;
}

export interface BookingReservedPayload {
  bookingId: string;
  customerId: string;
  customerName?: string;
  resourceId?: string;
  serviceId?: string;
  startAt: string;
  endAt: string;
}

export interface BookingCancelledPayload {
  bookingId: string;
  customerId: string;
  reason?: string;
  cancelledAt: string;
}

export interface BookingCompletedPayload {
  bookingId: string;
  customerId: string;
  completedAt: string;
}

export interface RetentionTriggerCampaignPayload {
  customerId: string;
  customerName?: string;
  campaignType: 'low_balance' | 'pass_exhausted' | 'churn_risk' | 'birthday' | 'custom';
  context: {
    passId?: string;
    remainingCount?: number;
    daysInactive?: number;
    referenceDate?: string;
    details?: string;
    [key: string]: unknown;
  };
}

export interface CustomerTransferredPayload {
  sourceCustomerId: string;
  targetCustomerId: string;
  tenantId: string;
  transferredAt: string;
  reason?: string;
}
