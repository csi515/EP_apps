/**
 * Tenant Query Keys & Atomic Cache Eviction Coordinator
 * 
 * 멀티테넌트 성능 최적화:
 * 1. TanStack Query의 모든 쿼리 키에 활성 organizationId 네임스페이스를 강제 바인딩 (Tenant Leaking 원천 차단)
 * 2. 매장(테넌트) 전환 시 queryClient.clear()를 호출해 인메모리 캐시를 원자적으로 파기
 */

import type { QueryClient } from '@tanstack/react-query';

export type TenantQueryKey = readonly [string, string, string, ...unknown[]];

/**
 * 활성 organizationId가 강제 바인딩된 네임스페이스 쿼리 키 생성
 */
export function createTenantQueryKey(
  organizationId: string | null | undefined,
  domain: string,
  ...args: unknown[]
): TenantQueryKey {
  const orgNamespace = organizationId && organizationId.trim().length > 0
    ? `org:${organizationId.trim()}`
    : 'org:__none__';

  return ['tenant', orgNamespace, domain, ...args] as const;
}

type QueryClearHandler = () => void;
const clearHandlers = new Set<QueryClearHandler>();
let registeredQueryClient: QueryClient | null = null;

/**
 * 전역 QueryClient 등록 (원자적 캐시 소멸용)
 */
export function setTenantQueryClient(client: QueryClient): void {
  registeredQueryClient = client;
}

/**
 * 매장(테넌트) 전환 시 호출할 캐시 클리어 리스너 등록
 */
export function registerTenantQueryClear(handler: QueryClearHandler): () => void {
  clearHandlers.add(handler);
  return () => {
    clearHandlers.delete(handler);
  };
}

/**
 * 테넌트 전환 시 인메모리 캐시를 원자적으로 파기 (Tenant Leaking 원천 방어)
 */
export function evictTenantMemoryCache(): void {
  try {
    if (registeredQueryClient) {
      if (typeof registeredQueryClient.cancelQueries === 'function') {
        void registeredQueryClient.cancelQueries();
      }
      if (typeof registeredQueryClient.clear === 'function') {
        registeredQueryClient.clear();
      }
      if (typeof registeredQueryClient.getMutationCache === 'function') {
        registeredQueryClient.getMutationCache()?.clear?.();
      }
    }
  } catch (err) {
    console.error('[TenantQuery] Failed to clear queryClient cache:', err);
  }

  for (const handler of clearHandlers) {
    try {
      handler();
    } catch (err) {
      console.error('[TenantQuery] Error in clear handler:', err);
    }
  }
}

/**
 * 특정 도메인(리소스)에 해당하는 테넌트 쿼리 캐시 무효화
 */
export function invalidateTenantQueries(domain: string, organizationId?: string): void {
  if (!registeredQueryClient) return;
  try {
    if (organizationId && organizationId.trim().length > 0) {
      registeredQueryClient.invalidateQueries({
        queryKey: ['tenant', `org:${organizationId.trim()}`, domain],
      });
    } else {
      registeredQueryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key.length >= 3 && key[0] === 'tenant' && key[2] === domain;
        },
      });
    }
  } catch (err) {
    console.error('[TenantQuery] Failed to invalidate queries for domain:', domain, err);
  }
}
