/** 페이지네이션 순수 계산 (1-based current) */

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export function computePageCount(total: number, pageSize: number): number {
  if (total <= 0 || pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

export function clampPage(page: number, pageCount: number): number {
  if (!Number.isFinite(page) || page < 1) return 1;
  if (page > pageCount) return pageCount;
  return Math.floor(page);
}

/** 현재 페이지에 표시되는 건수 범위 (0건이면 from/to = 0) */
export function computeItemRange(
  current: number,
  pageSize: number,
  total: number
): { from: number; to: number } {
  if (total <= 0 || pageSize <= 0) return { from: 0, to: 0 };
  const pageCount = computePageCount(total, pageSize);
  const page = clampPage(current, pageCount);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return { from, to };
}

export type PageToken = number | 'ellipsis';

/**
 * 페이지 번호 윈도우 (양끝 + 현재 주변).
 * siblingCount=1 → 1 … 4 5 6 … 20
 */
export function computePageWindow(
  current: number,
  pageCount: number,
  siblingCount = 1
): PageToken[] {
  const count = Math.max(1, pageCount);
  const page = clampPage(current, count);
  const siblings = Math.max(0, siblingCount);

  if (count <= siblings * 2 + 5) {
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  const left = Math.max(2, page - siblings);
  const right = Math.min(count - 1, page + siblings);
  const tokens: PageToken[] = [1];

  if (left > 2) tokens.push('ellipsis');
  for (let p = left; p <= right; p += 1) tokens.push(p);
  if (right < count - 1) tokens.push('ellipsis');
  tokens.push(count);

  return tokens;
}

/** Refine useList/useTable pagination 옵션과 맞추기 위한 기본값 */
export function toRefinePaginationOptions(current: number, pageSize: number) {
  return {
    current: Math.max(1, current),
    pageSize: Math.max(1, pageSize),
    mode: 'server' as const,
  };
}
