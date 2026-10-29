/**
 * EP_apps는 전용 업종 모듈 크롬이 없다. 기업 셸(ModuleAppShell)만 사용한다.
 */
import type { ComponentType } from 'react';
import type { ModuleIndustryId } from '@/core/industry/types';
import type { ModuleTheme } from '@/shared/components/layout/moduleTheme';

export type ModuleChrome = {
  theme: ModuleTheme;
  Sidebar: ComponentType;
};

const MODULE_CHROME: Partial<Record<ModuleIndustryId, ModuleChrome>> = {};

export function getModuleChrome(moduleId: ModuleIndustryId): ModuleChrome | undefined {
  return MODULE_CHROME[moduleId];
}
