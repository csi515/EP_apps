/**
 * 전사 통합 옴니서치 도메인 엔진 (OmniSearch Engine)
 *
 * Core-Capability-Preset 3계층 아키텍처 원칙을 준수하는 순수 비즈니스 로직.
 * 특정 업종을 몰라야 하며, 고객, 상품, 메뉴, 사규 규정, 기능 바로가기 등
 * 전사 자원을 키워드 연관도 가중치에 따라 실시간 랭킹 및 카테고리별 분류합니다.
 */

export type OmniSearchCategory = 'customer' | 'product' | 'policy' | 'menu' | 'action';

export interface OmniSearchItem {
  id: string;
  category: OmniSearchCategory;
  title: string;
  subtitle?: string;
  url?: string;
  keywords?: string[];
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface CategoryInfo {
  label: string;
  iconName: 'user' | 'package' | 'book' | 'layout' | 'zap';
  badgeColor: string;
}

export function getCategoryInfo(category: OmniSearchCategory): CategoryInfo {
  switch (category) {
    case 'customer':
      return { label: '고객 / 회원', iconName: 'user', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'product':
      return { label: '상품 / 자재', iconName: 'package', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'policy':
      return { label: '사규 / 수칙', iconName: 'book', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'menu':
      return { label: '페이지 / 화면', iconName: 'layout', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'action':
      return { label: '빠른 실행', iconName: 'zap', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  }
}

/**
 * 검색어와 대상 항목 간 연관도 점수 계산
 */
export function calculateMatchScore(item: OmniSearchItem, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  const titleLower = item.title.toLowerCase();
  const subtitleLower = (item.subtitle || '').toLowerCase();
  const keywordsLower = (item.keywords || []).map((k) => k.toLowerCase());

  let score = 0;

  // 1. 타이틀 완전 일치
  if (titleLower === q) {
    score += 100;
  } else if (titleLower.startsWith(q)) {
    // 타이틀 접두사 일치
    score += 50;
  } else if (titleLower.includes(q)) {
    // 타이틀 부분 일치
    score += 30;
  }

  // 2. 키워드 일치
  for (const kw of keywordsLower) {
    if (kw === q) {
      score += 40;
    } else if (kw.includes(q)) {
      score += 20;
    }
  }

  // 3. 서브타이틀(전화번호, 사규 본문 등) 일치
  if (subtitleLower.includes(q)) {
    score += 15;
  }

  return score;
}

/**
 * 옴니서치 랭킹 정렬 및 필터링
 */
export function filterAndRankOmniSearch(
  items: readonly OmniSearchItem[],
  query: string,
  options: { limit?: number; category?: OmniSearchCategory } = {}
): OmniSearchItem[] {
  const { limit = 20, category } = options;
  const q = query.trim();

  let pool = [...items];
  if (category) {
    pool = pool.filter((item) => item.category === category);
  }

  if (!q) {
    // 검색어가 없으면 기본 우선순위로 상위 n개 반환
    return pool.slice(0, limit);
  }

  const scoredItems = pool
    .map((item) => ({
      item,
      score: calculateMatchScore(item, q),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scoredItems.slice(0, limit).map((entry) => ({
    ...entry.item,
    score: entry.score,
  }));
}

/**
 * 검색 결과를 카테고리별로 그룹화
 */
export function groupOmniSearchResultsByCategory(
  items: readonly OmniSearchItem[]
): Partial<Record<OmniSearchCategory, OmniSearchItem[]>> {
  const groups: Partial<Record<OmniSearchCategory, OmniSearchItem[]>> = {};

  for (const item of items) {
    if (!groups[item.category]) {
      groups[item.category] = [];
    }
    groups[item.category]!.push(item);
  }

  return groups;
}
