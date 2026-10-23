/**
 * 업종 해석의 단일 진입점.
 *
 * - not_loaded: 조직/컨텍스트가 아직 로드되지 않음 (raw === undefined)
 * - blank:      로드됐지만 값이 null/빈 문자열
 * - unknown:    카탈로그에 없는 비어 있지 않은 값
 * - known:      카탈로그 id 또는 alias
 *
 * known 이외의 상태에서 id는 null이다. 피아노 로직을 적용하지 않는다.
 *
 * 레거시 매핑 검토: organizations.industry_type 컬럼은
 * `TEXT NOT NULL DEFAULT 'piano'`이다 (20260822000002_create_core_tables.sql).
 * 생성 RPC도 기본값이 'piano'이므로 저장된 행은 항상 명시적인 값을 가진다.
 * 따라서 런타임의 빈 값은 "레거시 피아노"가 아니라 미로드 또는 누락 상태이고,
 * piano로 매핑하지 않는다. 신규 생성 기본값(DEFAULT_CREATE_INDUSTRY_TYPE)은
 * 생성 UI 전용이며 여기서 쓰지 않는다.
 */
import { isBlankIndustryInput, parseIndustryType, type IndustryType } from './types';

export type IndustryResolutionStatus = 'not_loaded' | 'blank' | 'unknown' | 'known';

export interface IndustryResolution {
  status: IndustryResolutionStatus;
  id: IndustryType | null;
}

export function resolveIndustry(raw: string | null | undefined): IndustryResolution {
  if (raw === undefined) return { status: 'not_loaded', id: null };
  if (isBlankIndustryInput(raw)) return { status: 'blank', id: null };
  const id = parseIndustryType(raw);
  return id ? { status: 'known', id } : { status: 'unknown', id: null };
}

/** 카탈로그 업종 id 또는 null. 빈 값·미로드·unknown은 null (piano 아님). */
export function resolveIndustryId(raw: string | null | undefined): IndustryType | null {
  return resolveIndustry(raw).id;
}
