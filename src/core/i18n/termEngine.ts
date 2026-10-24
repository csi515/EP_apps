/**
 * 매장 맞춤 도메인 용어(Custom Terminology) 사전 순수 도메인 엔진 (Pure Functions)
 *
 * 목적:
 *  - 업종 프리셋 기본 용어 및 사업주 맞춤 설정에 따라 화면 레이블 실시간 치환
 *  - 예: 피아노학원은 '원생/연습실/수강권/레슨', 골프/헬스는 '회원/타석/회원권/PT', 미용실은 '고객/시술대/선불권/시술'
 */

export const STANDARD_TERM_KEYS = [
  'term.customer',
  'term.space',
  'term.pass',
  'term.instructor',
  'term.lesson',
] as const;

export type StandardTermKey = (typeof STANDARD_TERM_KEYS)[number];

export type ShortTermKey = 'customer' | 'space' | 'pass' | 'instructor' | 'lesson';

export const DEFAULT_TERMS: Record<StandardTermKey, string> = {
  'term.customer': '고객',
  'term.space': '공간',
  'term.pass': '이용권',
  'term.instructor': '강사',
  'term.lesson': '수업',
};

export const PRESET_DEFAULT_TERMS: Record<string, Partial<Record<StandardTermKey, string>>> = {
  piano: {
    'term.customer': '원생',
    'term.space': '연습실',
    'term.pass': '수강권',
    'term.instructor': '선생님',
    'term.lesson': '레슨',
  },
  general_academy: {
    'term.customer': '원생',
    'term.space': '강의실',
    'term.pass': '수강료',
    'term.instructor': '선생님',
    'term.lesson': '수업',
  },
  language_academy: {
    'term.customer': '수강생',
    'term.space': '강의실',
    'term.pass': '수강권',
    'term.instructor': '강사',
    'term.lesson': '수업',
  },
  taekwondo_academy: {
    'term.customer': '관원',
    'term.space': '수련장',
    'term.pass': '수련권',
    'term.instructor': '사범님',
    'term.lesson': '수련',
  },
  pilates: {
    'term.customer': '회원',
    'term.space': '기구룸',
    'term.pass': '회원권',
    'term.instructor': '강사',
    'term.lesson': '레슨',
  },
  gym_fitness: {
    'term.customer': '회원',
    'term.space': '운동존',
    'term.pass': '회원권',
    'term.instructor': '트레이너',
    'term.lesson': 'PT',
  },
  pt_fitness: {
    'term.customer': '회원',
    'term.space': '개인PT존',
    'term.pass': 'PT회원권',
    'term.instructor': '트레이너',
    'term.lesson': '개인PT',
  },
  indoor_golf: {
    'term.customer': '회원',
    'term.space': '타석',
    'term.pass': '타석이용권',
    'term.instructor': '레슨프로',
    'term.lesson': '골프레슨',
  },
  hair_salon: {
    'term.customer': '고객',
    'term.space': '시술체어',
    'term.pass': '선불권',
    'term.instructor': '디자이너',
    'term.lesson': '시술',
  },
  barber_shop: {
    'term.customer': '고객',
    'term.space': '바버체어',
    'term.pass': '회원권',
    'term.instructor': '바버',
    'term.lesson': '헤어케어',
  },
  auto_repair: {
    'term.customer': '고객/차주',
    'term.space': '리프트 베이',
    'term.pass': '정기점검권',
    'term.instructor': '엔지니어',
    'term.lesson': '정비 작업',
  },
  self_carwash: {
    'term.customer': '고객',
    'term.space': '세차 베이',
    'term.pass': '세차충전권',
    'term.instructor': '스태프',
    'term.lesson': '디테일링',
  },
  cafe: {
    'term.customer': '손님/단골',
    'term.space': '테이블',
    'term.pass': '스탬프쿠폰',
    'term.instructor': '바리스타',
    'term.lesson': '주문',
  },
  craft_repair: {
    'term.customer': '수강생',
    'term.space': '작업대',
    'term.pass': '클래스권',
    'term.instructor': '공방장',
    'term.lesson': '클래스',
  },
};

/**
 * 단축 키('customer') 또는 전체 키('term.customer')를 표준 키 형태로 정규화합니다.
 */
export function normalizeTermKey(key: string): StandardTermKey | string {
  const trimmed = key.trim();
  if (trimmed.startsWith('term.')) return trimmed;
  const mapped = `term.${trimmed}` as StandardTermKey;
  if ((STANDARD_TERM_KEYS as readonly string[]).includes(mapped)) {
    return mapped;
  }
  return trimmed;
}

/**
 * 1. 단일 용어 키 해석 (우선순위: 사업주 커스텀 설정 > 프리셋 기본값 > 기본 공통값 > fallback)
 * 'customer' 또는 'term.customer' 형태 모두 지원.
 */
export function getResolvedTerm(
  rawKey: string,
  customTerms?: Record<string, string>,
  presetId?: string,
  fallback?: string
): string {
  const key = normalizeTermKey(rawKey);

  // 1. 사업주 커스텀 설정
  if (customTerms) {
    if (customTerms[rawKey]?.trim()) return customTerms[rawKey].trim();
    if (customTerms[key]?.trim()) return customTerms[key].trim();
  }

  // 2. 업종 프리셋 기본 용어
  if (presetId && PRESET_DEFAULT_TERMS[presetId]) {
    const presetVal = PRESET_DEFAULT_TERMS[presetId][key as StandardTermKey];
    if (presetVal?.trim()) {
      return presetVal.trim();
    }
  }

  // 3. 시스템 공통 기본 용어
  if (key in DEFAULT_TERMS) {
    return DEFAULT_TERMS[key as StandardTermKey];
  }

  // 4. Fallback 또는 key 자체
  return fallback ?? rawKey;
}

/**
 * 2. 텍스트 내 {term.xxx} 및 {xxx} 토큰 실시간 일괄 치환 (순수 함수)
 */
export function replaceTenantTerms(
  text: string,
  customTerms?: Record<string, string>,
  presetId?: string
): string {
  if (!text) return text;

  return text.replace(/\{([a-zA-Z0-9_.]+)\}/g, (match, tokenKey: string) => {
    const normalized = normalizeTermKey(tokenKey);
    if ((STANDARD_TERM_KEYS as readonly string[]).includes(normalized)) {
      return getResolvedTerm(normalized, customTerms, presetId);
    }
    return match;
  });
}
