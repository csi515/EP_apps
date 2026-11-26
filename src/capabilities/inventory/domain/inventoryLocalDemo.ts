import { isSupabaseConfigured } from '@/lib/supabase';
import { isCorpDomainEnabled } from '@/core/auth/localAuth/isCorpDomain';

/** PostgREST / Refine 데이터 경로가 구성된 환경인지 */
export function isInventoryServerDataPathActive(): boolean {
  return isCorpDomainEnabled() || isSupabaseConfigured();
}

function isExplicitEnvFlag(raw: string | undefined): boolean {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

/** 오프라인·스토리보드용 카페/학원 데모 카탈로그 — 명시 env에서만 허용 */
export function isInventoryDemoCatalogExplicitlyEnabled(): boolean {
  return isExplicitEnvFlag(import.meta.env?.VITE_INVENTORY_DEMO_CATALOG as string | undefined);
}

/** 초기 localStorage 시드에 데모 품목·로트를 넣을지 */
export function shouldSeedInventoryDemoCatalog(disableDemoCatalogFallback?: boolean): boolean {
  if (disableDemoCatalogFallback) return false;
  if (isInventoryServerDataPathActive()) return false;
  return isInventoryDemoCatalogExplicitlyEnabled();
}

export type InventoryListQueryState = {
  isLoading?: boolean;
  isError?: boolean;
  isFetched?: boolean;
  isSuccess?: boolean;
  data?: unknown;
};

/** Refine list 쿼리가 서버 응답(빈 목록 포함)을 받았는지 */
export function isInventoryListQueryResolved(
  itemsQuery: InventoryListQueryState | undefined
): boolean {
  if (itemsQuery?.isLoading) return false;
  if (itemsQuery?.isError) return false;
  return Boolean(
    itemsQuery?.isFetched || itemsQuery?.isSuccess || itemsQuery?.data !== undefined
  );
}

/** 서버 목록 응답을 신뢰할 수 있는지 (빈 배열도 유효한 SoT) */
export function shouldTrustInventoryServerItems(
  itemsQuery: InventoryListQueryState | undefined
): boolean {
  if (!isInventoryServerDataPathActive()) return false;
  return isInventoryListQueryResolved(itemsQuery);
}

export function shouldTrustInventoryServerLots(
  lotsQuery: InventoryListQueryState | undefined
): boolean {
  return shouldTrustInventoryServerItems(lotsQuery);
}