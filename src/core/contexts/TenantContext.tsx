import { evictTenantMemoryCache, createTenantQueryKey } from '@/core/query/tenantQueryKeys';

export { createTenantQueryKey };

/** 매장 전환 전에 진행 중 쿼리를 취소하고 캐시를 비운다. */
export async function switchOrganization(): Promise<void> {
  evictTenantMemoryCache();
}
