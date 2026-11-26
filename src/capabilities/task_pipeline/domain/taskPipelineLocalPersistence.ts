import { isSupabaseConfigured } from '@/lib/supabase';
import { isCorpDomainEnabled } from '@/core/auth/localAuth/isCorpDomain';

/** PostgREST / Refine task_orders 경로가 구성된 환경인지 */
export function isTaskPipelineServerDataPathActive(): boolean {
  return isCorpDomainEnabled() || isSupabaseConfigured();
}

function isExplicitEnvFlag(raw: string | undefined): boolean {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

/** 오프라인·스토리보드용 localStorage 스냅샷 — 명시 env에서만 (서버 경로에서는 항상 false) */
export function isTaskPipelineOfflinePersistenceEnabled(): boolean {
  if (isTaskPipelineServerDataPathActive()) return false;
  return isExplicitEnvFlag(import.meta.env?.VITE_TASK_PIPELINE_OFFLINE as string | undefined);
}

export type TaskPipelineListQueryState = {
  isLoading?: boolean;
  isError?: boolean;
  isFetched?: boolean;
  isSuccess?: boolean;
  data?: unknown;
};

export function isTaskPipelineListQueryResolved(
  ordersQuery: TaskPipelineListQueryState | undefined
): boolean {
  if (ordersQuery?.isLoading) return false;
  if (ordersQuery?.isError) return false;
  return Boolean(
    ordersQuery?.isFetched || ordersQuery?.isSuccess || ordersQuery?.data !== undefined
  );
}

/** 서버 목록 응답을 신뢰할 수 있는지 (빈 배열도 유효한 SoT) */
export function shouldTrustTaskPipelineServerOrders(
  ordersQuery: TaskPipelineListQueryState | undefined
): boolean {
  if (!isTaskPipelineServerDataPathActive()) return false;
  return isTaskPipelineListQueryResolved(ordersQuery);
}