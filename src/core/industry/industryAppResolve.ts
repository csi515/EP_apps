import { hasIndustryModule, parseIndustryType, isBlankIndustryInput } from './types';

export type IndustryAppKind = 'module' | 'generic';

/**
 * 셸 선택. org 선택은 하지 않는다.
 * 미설정·unknown·모듈 없는 카탈로그 → Generic (piano로 위장하지 않음).
 */
export function resolveIndustryAppKind(
  industryType?: string | null
): IndustryAppKind {
  const parsed = parseIndustryType(industryType);
  if (!parsed) return 'generic';
  return hasIndustryModule(parsed) ? 'module' : 'generic';
}
