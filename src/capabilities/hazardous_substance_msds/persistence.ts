/** Refine list resource (`resources.ts`). */
export const HAZARDOUS_SUBSTANCE_REAGENT_RESOURCE = 'hazardous_substances';

export const HAZARDOUS_SUBSTANCE_USAGE_LOG_RESOURCE = 'chemical_usage_logs';

/**
 * 시약·MSDS 영속화 준비 여부.
 * `038_hazardous_substance_msds.sql` 적용(운영) + TENANT_SCOPED 등록 후 true.
 */
export const HAZARDOUS_SUBSTANCE_REAGENT_PERSISTENCE_ENABLED = true;