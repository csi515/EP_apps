import type { IndustryAppComponent, IndustryModuleDefinition } from './defineIndustryModule';

/**
 * EP_apps는 전용 업종 모듈 없이 GenericIndustryShell(personal_plant_ops)만 사용한다.
 */
export const INDUSTRY_MODULES: readonly IndustryModuleDefinition[] = [];

const MODULE_BY_ID = new Map(INDUSTRY_MODULES.map((m) => [m.id, m]));

export function getIndustryModule(id: string): IndustryModuleDefinition | undefined {
  return MODULE_BY_ID.get(id as IndustryModuleDefinition['id']);
}

export function listIndustryModules(): readonly IndustryModuleDefinition[] {
  return INDUSTRY_MODULES;
}

export const APP_BY_INDUSTRY: Record<string, IndustryAppComponent> = {};
