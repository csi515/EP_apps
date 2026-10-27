// @ts-nocheck
import type { StaffGrants } from '@/core/staff/staffGrants';
import type { TeacherPayType } from '@/capabilities/billing/finance/billingLedgerTypes';

/**
 * Legacy compatibility barrel.
 * 신규 domain type은 여기 정의하지 않는다. 소유 계층에서 import한다.
 * @see docs/TYPES_DOMAIN_MAP.md
 */

/** @deprecated 신규 코드는 `@/core/auth/types/sessionUser` */
export type { User, UserRole } from '@/core/auth/types/sessionUser';

export type StudentStatus = 'active' | 'leave' | 'withdrawn';

/** 수강 상태 — 월회비 청구 vs 회차권 차감 */
export type StudentBillingMode = 'monthly' | 'session_pass';

export const STUDENT_BILLING_MODE_LABEL: Record<StudentBillingMode, string> = {
  monthly: '월회비',
  session_pass: '회차권',
};

export function normalizeBillingMode(
  mode?: StudentBillingMode | string | null
): StudentBillingMode {
  return mode === 'session_pass' ? 'session_pass' : 'monthly';
}

export function isMonthlyBillingStudent(student: {
  billingMode?: StudentBillingMode | string | null;
}): boolean {
  return normalizeBillingMode(student.billingMode) === 'monthly';
}

export function isSessionPassBillingStudent(student: {
  billingMode?: StudentBillingMode | string | null;
}): boolean {
  return normalizeBillingMode(student.billingMode) === 'session_pass';
}

export function resolveDefaultBillingMode(
  settingsMode?: StudentBillingMode | string | null
): StudentBillingMode {
  return normalizeBillingMode(settingsMode);
}

/** 차량 운행·학원 방향 */
export type ShuttleDirection = 'pickup' | 'dropoff' | 'both';

/** 학생별 승하차 주소 */
export interface PickupAddress {
  id: string;
  label: string;
  address: string;
  detail?: string;
  contactName?: string;
  contactPhone?: string;
  directions?: string;
  shuttleDirection: ShuttleDirection;
  isDefault?: boolean;
}

/**
 * @deprecated 전역 union 아님. 저장은 string. 값 검증은 Industry
 */
export type StudentLevel = string;

export interface Student {
  id: string;
  studentNumber: string;
  name: string;
  gender: 'M' | 'F';
  birthDate: string;
  school: string;
  grade: string;
  /** @deprecated parent_student_links에서 파생 — UI는 getPrimaryGuardian 사용 */
  parentId?: string;
  /** @deprecated */
  parentName?: string;
  /** @deprecated */
  parentPhone?: string;
  phone?: string;
  emergencyContact?: string;
  address?: string;
  usesShuttleService?: boolean;
  pickupAddresses?: PickupAddress[];
  joinDate: string;
  leaveDate?: string;
  status: StudentStatus;
  teacherId: string;
  teacherName: string;
  classIds: string[];
  /** Industry 선택지 문자열. union 아님 */
  level: string;
  billingMode?: StudentBillingMode;
  tuitionFee: number;
  paymentDay: number;
  specialNotes?: string;
  memo?: string;
  avatarColor?: string;
  checkInPinSet?: boolean;
  userId?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Parent {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  studentIds: string[];
  notes?: string;
  createdAt: string;
}

export interface Teacher {
  id: string;
  name: string;
  phone: string;
  email?: string;
  userId?: string | null;
  hireDate: string;
  status: 'active' | 'inactive' | 'resigned';
  specialty?: string;
  salary?: number;
  hourlyRate?: number;
  payType?: TeacherPayType;
  color?: string;
  memo?: string;
  classIds?: string[];
  grants?: StaffGrants;
  defaultScheduleVisibility?: 'PUBLIC' | 'FREE_BUSY_ONLY' | 'PRIVATE';
  roleTitle?: string;
  organizationId?: string;
}

/** @deprecated 신규 코드는 `@/core/staff/workWindow` */
export type { DayOfWeek, StaffWorkWindow } from '@/core/staff/workWindow';

export interface ClassItem {
  id: string;
  name: string;
  teacherId: string;
  teacherName: string;
  daysOfWeek: import('@/core/staff/workWindow').DayOfWeek[];
  startTime: string;
  endTime: string;
  capacity: number;
  level?: string;
  targetLevel?: string;
  fee?: number;
  textbook?: string;
  room: string;
  memo?: string;
  color?: string;
}

/** 수업 출석 상태 (레거시 호환 인라인) */
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'early_leave' | 'make_up';

export interface AttendanceRecord {
  id: string;
  date: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  status: AttendanceStatus;
  absentReason?: string;
  makeUpRequired?: boolean;
  makeUpDate?: string;
  makeUpStartTime?: string;
  makeUpEndTime?: string;
  makeUpRoom?: string;
  makeUpTeacherId?: string;
  makeUpTeacherName?: string;
  memo?: string;
  createdBy: string;
  createdAt?: string;
  sessionPassId?: string;
}

export type MakeupStatus = 'pending' | 'scheduled' | 'completed';

export interface MakeupItem {
  attendanceId: string;
  studentId: string;
  studentName: string;
  parentPhone: string;
  classId: string;
  className: string;
  originalDate: string;
  absentReason?: string;
  makeUpDate?: string;
  makeUpStartTime?: string;
  makeUpEndTime?: string;
  makeUpRoom?: string;
  makeUpTeacherId?: string;
  makeUpTeacherName?: string;
  status: MakeupStatus;
  memo?: string;
}

export interface MakeupScheduleInput {
  date: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  teacherId?: string;
  teacherName?: string;
}

/** @deprecated 신규 코드는 `@/capabilities/billing/finance/billingLedgerTypes` */
export type {
  CombinedPaymentRequest,
  Expense,
  ExpenseCategory,
  ExpenseItem,
  InvoiceExtraItem,
  InvoiceStatus,
  PaymentMethod,
  StudentMonthlyBillingSummary,
  StudentUnpaidSummary,
  TeacherPayType,
  TuitionInvoice,
  TuitionPayment,
  UnpaidInvoiceItem,
} from '@/capabilities/billing/finance/billingLedgerTypes';

/** @deprecated 신규 코드는 `@/capabilities/resources` */
export type { PracticeRoomBooking, PracticeRoomBookingStatus } from '@/capabilities/resources/types';

/** @deprecated 신규 코드는 `@/capabilities/consultation` */
export type { Consultation, ConsultationType } from '@/capabilities/consultation/types';

export interface PracticeRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  minutes: number;
  songTitle: string;
  textbook?: string;
  page?: string;
  homework?: string;
  teacherEvaluation?: string;
  difficultyPart?: string;
  nextAssignment?: string;
  source?: 'staff' | 'parent';
  staffReviewed?: boolean;
  staffReviewedAt?: string;
  staffReviewNote?: string;
  createdAt?: string;
}

export interface LessonRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  classId?: string;
  className?: string;
  songTitle: string;
  progress: string;
  lessonContent: string;
  strengths?: string;
  weaknesses?: string;
  homework?: string;
  nextPlan?: string;
  teacherNotes?: string;
  memo?: string;
  teacherId: string;
  teacherName: string;
  createdAt?: string;
}

export type PerformanceVideoType = 'recital' | 'competition' | 'lesson' | 'practice' | 'other';

export interface PerformanceVideo {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  youtubeUrl: string;
  recordedDate?: string;
  eventType: PerformanceVideoType;
  songTitle?: string;
  memo?: string;
  eventId?: string;
  eventTitle?: string;
  createdAt?: string;
}

export interface Song {
  id: string;
  title: string;
  composer: string;
  difficulty: string;
  genre: string;
  relatedTextbook?: string;
  memo?: string;
  publisher?: string;
  level?: string;
  resourceType?: 'textbook' | 'repertoire' | 'competition' | 'theory';
  description?: string;
  difficultyStars?: number;
}

/** @deprecated 신규 코드는 `@/capabilities/commerce/textbookTypes` */
export type {
  InventoryTransactionType,
  Textbook,
  TextbookInventoryTransaction,
  TextbookPayment,
  TextbookPaymentStatus,
  TextbookSale,
} from '@/capabilities/commerce/textbookTypes';

/** @deprecated 신규 코드는 `@/core/notices/notificationTypes` */
export type {
  AppNotification,
  NotificationItem,
  NotificationType,
} from '@/core/notices/notificationTypes';

/** @deprecated 신규 코드는 `@/core/events` */
export type { AcademyEvent, EventParticipantSummary } from '@/core/events';

/** @deprecated 신규 코드는 `@/core/organizations/settingsTypes` */
export type {
  AcademyRoom,
  AcademyRoomKind,
  AcademySettings,
  OrganizationRoom,
  OrganizationRoomKind,
  OrganizationSettings,
  SettingsRetailCatalogItem as RetailProduct,
} from '@/core/organizations/settingsTypes';

/** @deprecated 신규 코드는 `@/core/public/types` */
export type { ConsultationSubmission, PublicOrgInfo } from '@/core/public/types';

/** @deprecated 신규 코드는 `@/core/customer/joinTypes` */
export type {
  CustomerJoinRequest,
  JoinRequestStatus,
  JoinRequestType,
} from '@/core/customer/joinTypes';

/** @deprecated 신규 코드는 `@/core/schedules/types` */
export type {
  BookableSchedule,
  CoreSchedule,
  MyReservation,
  Reservation,
  ReservationDetail,
  ReservationRequest,
  ReservationStatus,
  ScheduleFormData,
  ScheduleStatus,
} from '@/core/schedules/types';
