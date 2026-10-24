/**
 * Cross-Cache Synchronization Bridge (Refine TanStack Query <-> StorageService)
 * 
 * 참조 아키텍처: docs/MOA_DATA_CACHE_BOUNDARY.md
 * - 단방향 CUD 전파: Refine 관리자 화면에서 변경 시 StorageService 캐시/알림을 갱신.
 * - 현장/오프라인 복구 전파: StorageService Outbox flush 또는 로컬 쓰기 시 TanStack Query 캐시를 무효화.
 */

import type { QueryClient } from '@tanstack/react-query';
import { STORAGE_KEYS, type StorageKey } from '@/services/adapters/storageKeys';
import type { StorageChangeKey } from '@/services/adapters/types';
import { StorageService } from '@/services/storage';
import { invalidateTenantQueries, invalidateBillingQueries } from './tenantQueryKeys';
import { createLogger } from '@/core/logging';

const logger = createLogger('CrossCacheBridge');

/** Refine resource 명칭 -> StorageKey 매핑 */
export const RESOURCE_TO_STORAGE_KEY_MAP: Record<string, StorageKey> = {
  customers: STORAGE_KEYS.STUDENTS,
  schedules: STORAGE_KEYS.SCHEDULES,
  bookings: STORAGE_KEYS.SCHEDULES,
  session_passes: STORAGE_KEYS.SESSION_PASSES,
  passes: STORAGE_KEYS.SESSION_PASSES,
  lockers: STORAGE_KEYS.LOCKERS,
  tuition_invoices: STORAGE_KEYS.INVOICES,
  billing_invoices: STORAGE_KEYS.INVOICES,
  billing: STORAGE_KEYS.INVOICES,
  staff: STORAGE_KEYS.TEACHERS,
  instructors: STORAGE_KEYS.TEACHERS,
  classes: STORAGE_KEYS.CLASSES,
  attendance: STORAGE_KEYS.ATTENDANCE,
  consultations: STORAGE_KEYS.CONSULTATIONS,
  inventory_items: STORAGE_KEYS.TEXTBOOKS,
  seat_rooms: STORAGE_KEYS.PRACTICE_ROOM_BOOKINGS,
  curriculum_levels: STORAGE_KEYS.CURRICULUM_LEVELS,
  simple_ledgers: STORAGE_KEYS.EXPENSES,
  shuttle_routes: STORAGE_KEYS.SHUTTLE_RIDE_REQUESTS,
  daily_care_logs: STORAGE_KEYS.CARE_JOURNALS,
  care_timeline_entries: STORAGE_KEYS.CARE_CHILD_RECORDS,
  learning_journals: STORAGE_KEYS.LEARNING_REPORTS,
  achievement_quests: STORAGE_KEYS.ACHIEVEMENTS,
};

/** StorageKey -> 연관된 Refine resource 목록 역매핑 */
export const STORAGE_KEY_TO_RESOURCE_MAP: Partial<Record<StorageKey, readonly string[]>> = {
  [STORAGE_KEYS.STUDENTS]: ['customers'],
  [STORAGE_KEYS.SCHEDULES]: ['schedules', 'bookings'],
  [STORAGE_KEYS.SESSION_PASSES]: ['session_passes', 'passes'],
  [STORAGE_KEYS.LOCKERS]: ['lockers'],
  [STORAGE_KEYS.INVOICES]: ['tuition_invoices', 'billing_invoices', 'billing'],
  [STORAGE_KEYS.TEACHERS]: ['staff', 'instructors'],
  [STORAGE_KEYS.CLASSES]: ['classes'],
  [STORAGE_KEYS.ATTENDANCE]: ['attendance'],
  [STORAGE_KEYS.CONSULTATIONS]: ['consultations'],
  [STORAGE_KEYS.TEXTBOOKS]: ['inventory_items'],
  [STORAGE_KEYS.PRACTICE_ROOM_BOOKINGS]: ['seat_rooms'],
  [STORAGE_KEYS.CURRICULUM_LEVELS]: ['curriculum_levels'],
  [STORAGE_KEYS.EXPENSES]: ['simple_ledgers'],
  [STORAGE_KEYS.SHUTTLE_RIDE_REQUESTS]: ['shuttle_routes'],
  [STORAGE_KEYS.CARE_JOURNALS]: ['daily_care_logs'],
  [STORAGE_KEYS.CARE_CHILD_RECORDS]: ['care_timeline_entries'],
  [STORAGE_KEYS.LEARNING_REPORTS]: ['learning_journals'],
  [STORAGE_KEYS.ACHIEVEMENTS]: ['achievement_quests'],
};

/**
 * StorageService와 직접 통신 가능한 인터페이스 (내부 캐시/이벤트 갱신용)
 */
interface NotifiableStorage {
  notify?: (key: StorageKey) => void;
}

/**
 * Refine CUD 변경 -> StorageService 동기화 브리지.
 * Refine Mutation이 완료되었을 때 호출하여 StorageService의 캐시를 갱신한다.
 * 
 * @param resource - 변경된 Refine 리소스 명칭
 */
export function notifyStorageFromRefineResource(resource: string): void {
  const targetKey = RESOURCE_TO_STORAGE_KEY_MAP[resource];
  if (targetKey) {
    const notifiableStorage = StorageService as unknown as NotifiableStorage;
    if (typeof notifiableStorage.notify === 'function') {
      notifiableStorage.notify(targetKey);
    }
  }
}

/**
 * StorageService 변경 이벤트 -> TanStack Query 캐시 무효화 브리지 설정.
 * 현장 화면 또는 Outbox에서 데이터가 반영되었을 때 Refine 관리자 화면의 쿼리 캐시를 무효화한다.
 */
export function setupStorageToQueryBridge(
  queryClient: QueryClient,
  resolveOrgId?: () => string | null
): () => void {
  const handleStorageChange = (changedKey: StorageChangeKey) => {
    try {
      const activeOrgId = resolveOrgId ? resolveOrgId() : null;

      if (changedKey === '*') {
        // 전체 hydrate 또는 일괄 무효화: 주요 리소스 전체 무효화
        const allResources = Object.keys(RESOURCE_TO_STORAGE_KEY_MAP);
        for (const res of allResources) {
          queryClient.invalidateQueries({ queryKey: [res] });
          invalidateTenantQueries(res, activeOrgId || undefined);
        }
        invalidateBillingQueries(activeOrgId || undefined);
        return;
      }

      if (changedKey === STORAGE_KEYS.INVOICES) {
        invalidateBillingQueries(activeOrgId || undefined);
      }

      const mappedResources = STORAGE_KEY_TO_RESOURCE_MAP[changedKey];
      if (mappedResources) {
        for (const res of mappedResources) {
          queryClient.invalidateQueries({ queryKey: [res] });
          invalidateTenantQueries(res, activeOrgId || undefined);
        }
      }
    } catch (err) {
      logger.error('Error invalidating queries:', err);
    }
  };

  return StorageService.subscribe(handleStorageChange);
}
