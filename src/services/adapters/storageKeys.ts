import {
  localWriteConfirmsPersist,
  persistencePolicyFor,
  type PersistencePolicy,
} from '@/core/storage/persistencePolicy';

/**
 * EP_apps storage key taxonomy.
 *
 * localStorage는 사업 데이터의 독립 SoT가 아니다. 역할은 다음으로 한정한다.
 * - Supabase remote의 local mirror / cache (SUPABASE_SYNC_KEYS)
 * - offline snapshot (hydrate 실패·재시작 대비 writeLocal)
 * - sync outbox(별도 키, syncOutbox.ts) — remote persist 재시도 상태
 * - device-only UI / 온보딩 상태 (LOCAL_ONLY_KEYS 일부)
 * - legacy local-only 행 호환 (교재 판매·수납 등 — DB에 없는 기존 행 보존)
 *
 * 원본(SoT)은 Supabase(또는 도메인별 direct CRUD)이며,
 * localStorage 기록 성공 ≠ 원격/업무 성공으로 해석하지 않는다.
 */
export const STORAGE_KEYS = {
  STUDENTS: 'ep_app_students',
  PARENTS: 'ep_app_parents',
  PARENT_STUDENT_LINKS: 'core_parent_student_links',
  TEACHERS: 'ep_app_teachers',
  CLASSES: 'ep_app_classes',
  ATTENDANCE: 'ep_app_attendance',
  ATTENDANCE_SESSIONS: 'core_attendance_sessions',
  CUSTOMER_PINS: 'core_customer_pins',
  INVOICES: 'ep_app_invoices',
  TUITION_PAYMENTS: 'ep_app_tuition_payments',
  EXPENSES: 'core_expenses',
  /** 강사 정산 확정 기록 (core.teacher_payroll_settlements 동기화) */
  TEACHER_PAYROLL_SETTLEMENTS: 'core_teacher_payroll_settlements',
  INCOME_ENTRIES: 'core_income_entries',
  CONSULTATIONS: 'ep_app_consultations',
  PRACTICE_RECORDS: 'ep_app_practice_records',
  LESSON_RECORDS: 'ep_app_lesson_records',
  TEXTBOOKS: 'ep_app_textbooks',
  /** 교재 판매 — DB direct CRUD + local mirror(+ legacy local-only 행 호환) */
  TEXTBOOK_SALES: 'ep_app_textbook_sales',
  /** 교재 수납 — DB direct CRUD + local mirror(+ legacy local-only 행 호환) */
  TEXTBOOK_PAYMENTS: 'ep_app_textbook_payments',
  TEXTBOOK_INVENTORY_TRANSACTIONS: 'ep_app_textbook_inventory_transactions',
  SONGS: 'ep_app_songs',
  EVENTS: 'ep_app_events',
  PERFORMANCE_VIDEOS: 'ep_app_performance_videos',
  CURRICULUM_LEVELS: 'ep_curriculum_levels',
  CURRICULUM_ITEMS: 'ep_curriculum_items',
  CURRICULUM_PROGRESS: 'ep_curriculum_progress',
  WEEKLY_ASSIGNMENTS: 'ep_weekly_assignments',
  ACHIEVEMENTS: 'ep_achievements',
  LEARNING_REPORTS: 'ep_learning_reports',
  NOTIFICATIONS: 'ep_app_notifications',
  SETTINGS: 'ep_app_settings',
  SCHEDULES: 'core_schedules',
  SERVICE_OFFERINGS: 'core_service_offerings',
  SESSION_PASSES: 'core_session_passes',
  LOCKERS: 'core_lockers',
  SLOT_RECRUITMENTS: 'core_slot_recruitments',
  /** 체육관 등 — 차량 운행 신청 (remote 테이블 없음 → device-local) */
  SHUTTLE_RIDE_REQUESTS: 'core_shuttle_ride_requests',
  /** @deprecated 레거시 로컬 연습실 예약 — 원본은 room_reservations. sync 시 비움, 읽기 호환만 */
  PRACTICE_ROOM_BOOKINGS: 'core_practice_room_bookings',
  /** 케어 플러그인 — 알림장 */
  CARE_JOURNALS: 'ep_care_journals',
  /** 케어 플러그인 — 투약 의뢰 */
  MEDICATION_REQUESTS: 'ep_medication_requests',
  /** 케어 — 원아 건강·귀가 기록 (core.care_child_records) */
  CARE_CHILD_RECORDS: 'ep_care_child_records',
  /** 케어 — 사고 기록 (core.care_incidents) */
  CARE_INCIDENTS: 'ep_care_incidents',
  /** 케어 — 보건증 만료 (core.care_staff_health_certs) */
  CARE_STAFF_HEALTH_CERTS: 'ep_care_staff_health_certs',
  /** 케어 — 안전점검·대피훈련 (core.care_safety_logs) */
  CARE_SAFETY_LOGS: 'ep_care_safety_logs',
  /** 케어 — 보존식 (core.care_meal_samples) */
  CARE_MEAL_SAMPLES: 'ep_care_meal_samples',
  /** 케어 — CCTV 열람 신청 (core.care_cctv_requests) */
  CARE_CCTV_REQUESTS: 'ep_care_cctv_requests',
  /** 케어 — 하원 인수 (core.care_pickup_logs) */
  CARE_PICKUP_LOGS: 'ep_care_pickup_logs',
  /** device-only UI — 활성 사용자 표시 */
  ACTIVE_USER: 'ep_app_active_user',
  /** device-only — 초기화/온보딩 완료 플래그 */
  INITIALIZED: 'ep_app_initialized_v3',
  /** device-only UI — 온보딩 진행 (org 스코프). completed/skipped는 INITIALIZED와 함께 기록 */
  ONBOARDING_PROGRESS: 'ep_app_onboarding_progress_v1',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * new STORAGE_KEYS 값 → 구 piano_/daycare_ 키.
 * readLocal 마이그레이션·로그아웃 시 레거시 캐시 정리에 사용.
 */
export const LEGACY_STORAGE_KEY_ALIASES: Readonly<Partial<Record<StorageKey, string>>> = {
  [STORAGE_KEYS.STUDENTS]: 'piano_app_students',
  [STORAGE_KEYS.PARENTS]: 'piano_app_parents',
  [STORAGE_KEYS.TEACHERS]: 'piano_app_teachers',
  [STORAGE_KEYS.CLASSES]: 'piano_app_classes',
  [STORAGE_KEYS.ATTENDANCE]: 'piano_app_attendance',
  [STORAGE_KEYS.INVOICES]: 'piano_app_invoices',
  [STORAGE_KEYS.TUITION_PAYMENTS]: 'piano_app_tuition_payments',
  [STORAGE_KEYS.CONSULTATIONS]: 'piano_app_consultations',
  [STORAGE_KEYS.PRACTICE_RECORDS]: 'piano_app_practice_records',
  [STORAGE_KEYS.LESSON_RECORDS]: 'piano_app_lesson_records',
  [STORAGE_KEYS.TEXTBOOKS]: 'piano_app_textbooks',
  [STORAGE_KEYS.TEXTBOOK_SALES]: 'piano_app_textbook_sales',
  [STORAGE_KEYS.TEXTBOOK_PAYMENTS]: 'piano_app_textbook_payments',
  [STORAGE_KEYS.TEXTBOOK_INVENTORY_TRANSACTIONS]: 'piano_app_textbook_inventory_transactions',
  [STORAGE_KEYS.SONGS]: 'piano_app_songs',
  [STORAGE_KEYS.EVENTS]: 'piano_app_events',
  [STORAGE_KEYS.PERFORMANCE_VIDEOS]: 'piano_app_performance_videos',
  [STORAGE_KEYS.CURRICULUM_LEVELS]: 'piano_curriculum_levels',
  [STORAGE_KEYS.CURRICULUM_ITEMS]: 'piano_curriculum_items',
  [STORAGE_KEYS.CURRICULUM_PROGRESS]: 'piano_curriculum_progress',
  [STORAGE_KEYS.WEEKLY_ASSIGNMENTS]: 'piano_weekly_assignments',
  [STORAGE_KEYS.ACHIEVEMENTS]: 'piano_achievements',
  [STORAGE_KEYS.LEARNING_REPORTS]: 'piano_learning_reports',
  [STORAGE_KEYS.NOTIFICATIONS]: 'piano_app_notifications',
  [STORAGE_KEYS.SETTINGS]: 'piano_app_settings',
  [STORAGE_KEYS.CARE_JOURNALS]: 'daycare_care_journals',
  [STORAGE_KEYS.MEDICATION_REQUESTS]: 'daycare_medication_requests',
  [STORAGE_KEYS.CARE_CHILD_RECORDS]: 'daycare_care_child_records',
  [STORAGE_KEYS.CARE_INCIDENTS]: 'daycare_care_incidents',
  [STORAGE_KEYS.CARE_STAFF_HEALTH_CERTS]: 'daycare_care_staff_health_certs',
  [STORAGE_KEYS.CARE_SAFETY_LOGS]: 'daycare_care_safety_logs',
  [STORAGE_KEYS.CARE_MEAL_SAMPLES]: 'daycare_care_meal_samples',
  [STORAGE_KEYS.CARE_CCTV_REQUESTS]: 'daycare_care_cctv_requests',
  [STORAGE_KEYS.CARE_PICKUP_LOGS]: 'daycare_care_pickup_logs',
  [STORAGE_KEYS.ACTIVE_USER]: 'piano_app_active_user',
  [STORAGE_KEYS.INITIALIZED]: 'piano_app_initialized_v3',
  [STORAGE_KEYS.ONBOARDING_PROGRESS]: 'piano_app_onboarding_progress_v1',
};

/** 로그아웃 후에도 유지하는 device-only STORAGE_KEYS (PWA/온보딩/기기 UI) */
export const DEVICE_ONLY_PERSISTED_KEYS: ReadonlySet<StorageKey> = new Set([
  STORAGE_KEYS.ACTIVE_USER,
  STORAGE_KEYS.INITIALIZED,
  STORAGE_KEYS.ONBOARDING_PROGRESS,
]);

/** STORAGE_KEYS 밖 device 상태. 로그아웃 시 유지 */
export const DEVICE_ONLY_RAW_KEYS = ['ep.pwa.dismissUntil', 'ep.pwa.installed'] as const;

/** 구 moa.pwa.* — 읽기/보존 호환 */
export const LEGACY_DEVICE_ONLY_RAW_KEYS = ['moa.pwa.dismissUntil', 'moa.pwa.installed'] as const;

export const PENDING_MUTATIONS_PREFIX = 'ep:pending-mutations:';
export const SYNC_OUTBOX_PREFIX = 'ep:sync-outbox:';
export const LEGACY_PENDING_MUTATIONS_PREFIX = 'moa:pending-mutations:';
export const LEGACY_SYNC_OUTBOX_PREFIX = 'moa:sync-outbox:';

export function isPreservedOnSignOut(storageKey: string): boolean {
  if ((DEVICE_ONLY_RAW_KEYS as readonly string[]).includes(storageKey)) return true;
  if ((LEGACY_DEVICE_ONLY_RAW_KEYS as readonly string[]).includes(storageKey)) return true;
  for (const base of DEVICE_ONLY_PERSISTED_KEYS) {
    if (storageKey === base || storageKey.startsWith(`${base}_`)) return true;
    const legacy = LEGACY_STORAGE_KEY_ALIASES[base];
    if (legacy && (storageKey === legacy || storageKey.startsWith(`${legacy}_`))) return true;
  }
  return false;
}

/** 조직 업무 스냅샷·pending·outbox. 다른 계정이 재사용하면 안 되는 키 */
export function isBusinessCacheKey(storageKey: string): boolean {
  if (isPreservedOnSignOut(storageKey)) return false;
  if (storageKey.startsWith(PENDING_MUTATIONS_PREFIX)) return true;
  if (storageKey.startsWith(SYNC_OUTBOX_PREFIX)) return true;
  if (storageKey.startsWith(LEGACY_PENDING_MUTATIONS_PREFIX)) return true;
  if (storageKey.startsWith(LEGACY_SYNC_OUTBOX_PREFIX)) return true;
  for (const base of Object.values(STORAGE_KEYS)) {
    if (storageKey === base || storageKey.startsWith(`${base}_`)) return true;
  }
  for (const legacy of Object.values(LEGACY_STORAGE_KEY_ALIASES)) {
    if (!legacy) continue;
    if (storageKey === legacy || storageKey.startsWith(`${legacy}_`)) return true;
  }
  return false;
}

/**
 * Core 스키마 ↔ local mirror (Phase 3).
 * localStorage = remote cache / offline snapshot. 원본은 Core/Supabase.
 */
export const CORE_SYNC_KEYS: ReadonlySet<StorageKey> = new Set([
  STORAGE_KEYS.SETTINGS,
  STORAGE_KEYS.TEACHERS,
  STORAGE_KEYS.STUDENTS,
  STORAGE_KEYS.PARENTS,
  STORAGE_KEYS.PARENT_STUDENT_LINKS,
  STORAGE_KEYS.CLASSES,
  STORAGE_KEYS.INVOICES,
  STORAGE_KEYS.TUITION_PAYMENTS,
  STORAGE_KEYS.CONSULTATIONS,
  STORAGE_KEYS.NOTIFICATIONS,
  STORAGE_KEYS.SCHEDULES,
  STORAGE_KEYS.SERVICE_OFFERINGS,
  STORAGE_KEYS.EXPENSES,
  STORAGE_KEYS.INCOME_ENTRIES,
  STORAGE_KEYS.TEACHER_PAYROLL_SETTLEMENTS,
  STORAGE_KEYS.ATTENDANCE_SESSIONS,
  STORAGE_KEYS.CUSTOMER_PINS,
  STORAGE_KEYS.PRACTICE_ROOM_BOOKINGS,
  STORAGE_KEYS.SESSION_PASSES,
  STORAGE_KEYS.LOCKERS,
]);

/**
 * LEGACY/unused EP sync — 교육·커리큘럼 모듈 Supabase sync 키 집합.
 * (구 PIANO_SYNC_KEYS 명칭 유지 — 다수 import/레지스트리 문자열 매칭)
 *
 * TEXTBOOK_SALES / TEXTBOOK_PAYMENTS 는 여기에 넣지 않는다 —
 * DB 우선 직접 CRUD + hydrate 시 local mirror(및 legacy 행 병합).
 * debounced persist(diff-delete)에서 제외해 다기기 삭제·legacy 자동 업로드를 막는다.
 */
export const PIANO_SYNC_KEYS: ReadonlySet<StorageKey> = new Set([
  STORAGE_KEYS.STUDENTS,
  STORAGE_KEYS.ATTENDANCE,
  STORAGE_KEYS.PRACTICE_RECORDS,
  STORAGE_KEYS.LESSON_RECORDS,
  STORAGE_KEYS.TEXTBOOKS,
  STORAGE_KEYS.TEXTBOOK_INVENTORY_TRANSACTIONS,
  STORAGE_KEYS.SONGS,
  STORAGE_KEYS.EVENTS,
  STORAGE_KEYS.PERFORMANCE_VIDEOS,
  STORAGE_KEYS.CURRICULUM_LEVELS,
  STORAGE_KEYS.CURRICULUM_ITEMS,
  STORAGE_KEYS.CURRICULUM_PROGRESS,
  STORAGE_KEYS.WEEKLY_ASSIGNMENTS,
  STORAGE_KEYS.ACHIEVEMENTS,
  STORAGE_KEYS.LEARNING_REPORTS,
]);

/** @deprecated 별칭 — PIANO_SYNC_KEYS 와 동일 */
export const MODULE_SYNC_KEYS = PIANO_SYNC_KEYS;

/**
 * 교재 판매/수납 — hydrate·in-memory cache·local mirror 전용 키.
 *
 * 정책:
 * - 원본(SoT): DB direct CRUD
 * - localStorage: DB 성공 후 mirror + 오프라인 스냅샷
 * - legacy: DB에 없는 기존 local-only 행은 삭제·자동 backfill하지 않고 hydrate 시 병합
 * - debounced adapter persist / diff-delete: 비활성 (PIANO_SYNC_KEYS 미포함)
 */
export const PIANO_TEXTBOOK_COMMERCE_HYDRATE_KEYS: ReadonlySet<StorageKey> = new Set([
  STORAGE_KEYS.TEXTBOOK_SALES,
  STORAGE_KEYS.TEXTBOOK_PAYMENTS,
]);

/** 케어 플러그인 — remote sync + local mirror. 원본은 core.care_* . */
export const DAYCARE_SYNC_KEYS: ReadonlySet<StorageKey> = new Set([
  STORAGE_KEYS.CARE_JOURNALS,
  STORAGE_KEYS.MEDICATION_REQUESTS,
  STORAGE_KEYS.CARE_CHILD_RECORDS,
  STORAGE_KEYS.CARE_INCIDENTS,
  STORAGE_KEYS.CARE_STAFF_HEALTH_CERTS,
  STORAGE_KEYS.CARE_SAFETY_LOGS,
  STORAGE_KEYS.CARE_MEAL_SAMPLES,
  STORAGE_KEYS.CARE_CCTV_REQUESTS,
  STORAGE_KEYS.CARE_PICKUP_LOGS,
]);

/**
 * Device-local 키 (Supabase debounced sync 제외).
 * 원격 원본이 없거나 UI/온보딩 전용 — 다기기 공유 SoT가 아님.
 *
 * - ACTIVE_USER / INITIALIZED / ONBOARDING_PROGRESS: device-only UI·온보딩 상태
 * - SLOT_RECRUITMENTS: 키는 LOCAL_ONLY이나 settings.slotRecruitments로 이중 저장·동기화
 * - SHUTTLE_*: remote 테이블 없음 → device-local
 */
export const LOCAL_ONLY_KEYS: ReadonlySet<StorageKey> = new Set([
  STORAGE_KEYS.ACTIVE_USER,
  STORAGE_KEYS.INITIALIZED,
  STORAGE_KEYS.ONBOARDING_PROGRESS,
  STORAGE_KEYS.SLOT_RECRUITMENTS, // settings.slotRecruitments 미러
  STORAGE_KEYS.SHUTTLE_RIDE_REQUESTS,
]);

/**
 * Supabase 연동 키 전체 = remote 원본의 local mirror/cache 대상.
 * (Core + module sync + 교재 commerce hydrate mirror + care)
 *
 * - 일반 sync 키: hydrate + debounced persist (실패 시 syncOutbox 재시도)
 * - PIANO_TEXTBOOK_COMMERCE_HYDRATE_KEYS: hydrate·cache·mirror만 (adapter persist 없음)
 *
 * localStorage에 쓰여도 원본은 DB이며, 여기는 cache / offline snapshot이다.
 */
export const SUPABASE_SYNC_KEYS: ReadonlySet<StorageKey> = new Set([
  ...CORE_SYNC_KEYS,
  ...PIANO_SYNC_KEYS,
  ...PIANO_TEXTBOOK_COMMERCE_HYDRATE_KEYS,
  ...DAYCARE_SYNC_KEYS,
]);

/** 선언된 policy가 있으면 그걸 쓰고, 없으면 기존 SYNC/LOCAL_ONLY 분류를 유지한다. */
export function storageKeyPolicy(key: StorageKey): PersistencePolicy {
  const fallback: PersistencePolicy = LOCAL_ONLY_KEYS.has(key)
    ? 'local-only'
    : 'server-with-local-cache';
  return persistencePolicyFor(key, fallback);
}

export function storageKeyLocalWriteConfirms(key: StorageKey): boolean {
  const fallback: PersistencePolicy = LOCAL_ONLY_KEYS.has(key)
    ? 'local-only'
    : 'server-with-local-cache';
  return localWriteConfirmsPersist(key, fallback);
}
