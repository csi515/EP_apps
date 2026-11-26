/** Refine list resource (`resources.ts`). */
export const HAZARDOUS_SUBSTANCE_REAGENT_RESOURCE = 'hazardous_substances';

export const HAZARDOUS_SUBSTANCE_USAGE_LOG_RESOURCE = 'chemical_usage_logs';

/**
 * 시약·MSDS 영속화 준비 여부.
 * `core` 테이블 마이그레이션 + `TENANT_SCOPED_RESOURCES` 등록 후 true로 전환.
 * (현재: Refine 리소스만 선언, DB·dataProvider 미연동 — fail-closed)
 */
export const HAZARDOUS_SUBSTANCE_REAGENT_PERSISTENCE_ENABLED = false;