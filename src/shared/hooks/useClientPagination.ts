import { useCallback, useEffect, useMemo, useState } from 'react';
import { clampPage, computePageCount } from '@/shared/components/ui/paginationModel';

/**
 * 클라이언트 배열 페이지네이션.
 * 필터로 items가 줄면 현재 페이지를 자동 clamp.
 */
export function useClientPagination<T>(items: readonly T[], initialPageSize = 20) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const total = items.length;
  const pageCount = computePageCount(total, pageSize);
  const safePage = clampPage(page, pageCount);

  useEffect(() => {
    if (safePage !== page) setPage(safePage);
  }, [page, safePage]);

  const pagedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  return {
    page: safePage,
    pageSize,
    total,
    pagedItems,
    setPage,
    setPageSize,
  };
}
