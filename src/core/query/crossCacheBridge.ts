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
import { invalidateTenantQueries } from './tenantQueryKeys';

/** Refine resource 명칭 -> StorageKey 매핑 */
export const RESOURCE_TO_STORAGE_KEY_MAP: Record<string, StorageKey> = {
  customers: STORAGE_KEYS.STUDENTS,
  schedules: STORAGE_KEYS.SCHEDULES,
  session_passes: STORAGE_KEYS.SESSION_PASSES,
  passes: STORAGE_KEYS.SESSION_PASSES,
  lockers: STORAGE_KEYS.LOCKERS,
  tuition_invoices: STORAGE_KEYS.INVOICES,
  staff: STORAGE_KEYS.TEACHERS,
  classes: STORAGE_KEYS.CLASSES,
};

/** StorageKey -> 연관된 Refine resource 목록 역매핑 */
export const STORAGE_KEY_TO_RESOURCE_MAP: Partial<Record<StorageKey, readonly string[]>> = {
  [STORAGE_KEYS.STUDENTS]: ['customers'],
  [STORAGE_KEYS.SCHEDULES]: ['schedules', 'bookings'],
  [STORAGE_KEYS.SESSION_PASSES]: ['session_passes', 'passes'],
  [STORAGE_KEYS.LOCKERS]: ['lockers'],
  [STORAGE_KEYS.INVOICES]: ['tuition_invoices'],
  [STORAGE_KEYS.TEACHERS]: ['staff'],
  [STORAGE_KEYS.CLASSES]: ['classes'],
};

/**
 * Refine DataProvider에서 CUD 완료 후 호출.
 * 매핑된 StorageKey가 존재하면 StorageService에 변경을 통지하여
 * 업종 워크스페이스 대시보드 및 현장 키오스크의 stale 상태를 즉시 해소한다.
 */
export function notifyStorageFromRefineResource(resource: string): void {
  const targetKey = RESOURCE_TO_STORAGE_KEY_MAP[resource];
  if (targetKey && typeof (StorageService as any).notify === 'function') {
    (StorageService as any).notify(targetKey);
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
        return;
      }

      const mappedResources = STORAGE_KEY_TO_RESOURCE_MAP[changedKey];
      if (mappedResources) {
        for (const res of mappedResources) {
          queryClient.invalidateQueries({ queryKey: [res] });
          invalidateTenantQueries(res, activeOrgId || undefined);
        }
      }
    } catch (err) {
      console.error('[CrossCacheBridge] Error invalidating queries:', err);
    }
  };

  return StorageService.subscribe(handleStorageChange);
}
