/**
 * industry_type(카탈로그 id · 프리셋 id) → 전용 모듈 id 해석.
 * EP_apps는 전용 모듈 없이 personal_plant_ops 기업 크롬만 사용한다.
 */
import {
  hasIndustryModule,
  parseIndustryType,
  type ModuleIndustryId,
} from '@/core/industry/types';
import {
  SHARED_MODULE_BY_INDUSTRY,
  resolveSharedModuleId,
} from '@/core/industry/sharedModuleBindings';

/** @deprecated Core SHARED_MODULE_BY_INDUSTRY 사용 */
export const PRESET_MODULE_BINDINGS = SHARED_MODULE_BY_INDUSTRY;

/** GenericIndustryShell + ModuleAppShell (Refine 독 숨김) */
export const CORPORATE_CHROME_PRESETS: ReadonlySet<string> = new Set([
  'personal_plant_ops',
  'personal_plant',
  'plant_ops',
  'ep_apps',
  'EP_apps',
]);

export function isCorporateChromePreset(
  industryType?: string | null
): boolean {
  const raw = industryType?.trim() ?? '';
  if (!raw) return false;
  if (CORPORATE_CHROME_PRESETS.has(raw)) return true;
  return false;
}

export function resolveModuleIndustryId(
  industryType?: string | null
): ModuleIndustryId | null {
  const raw = industryType?.trim() ?? '';
  if (!raw) {
    return null;
  }

  const shared = resolveSharedModuleId(raw);
  if (shared && hasIndustryModule(shared)) {
    return shared as ModuleIndustryId;
  }

  const parsed = parseIndustryType(raw);
  if (parsed && hasIndustryModule(parsed)) {
    return parsed as ModuleIndustryId;
  }
  return null;
}

export function shouldUseModuleChrome(
  industryType: string | null | undefined,
  pathname: string
): boolean {
  const onWorkspace =
    pathname === '/' ||
    pathname === '' ||
    pathname.startsWith('/workspace') ||
    pathname.startsWith('/rnd');
  if (!onWorkspace) return false;
  if (resolveModuleIndustryId(industryType)) return true;
  return isCorporateChromePreset(industryType);
}
