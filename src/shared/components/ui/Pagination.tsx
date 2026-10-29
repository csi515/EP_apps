import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import {
  DEFAULT_PAGE_SIZE_OPTIONS,
  clampPage,
  computeItemRange,
  computePageCount,
  computePageWindow,
} from './paginationModel';

const PAGINATION_COPY = {
  navLabel: '페이지 탐색',
  prev: '이전',
  next: '다음',
  page: (n: number) => `${n}페이지`,
  summary: (from: number, to: number, total: number) =>
    total === 0 ? '0건' : `${from}–${to} / ${total}건`,
  pageSizeLabel: '페이지당',
  pageSizeOption: (n: number) => `${n}건`,
} as const;

export interface PaginationProps {
  /** 1부터 시작 */
  current: number;
  pageSize: number;
  /** 전체 건수 (서버 total) */
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  disabled?: boolean;
  className?: string;
  hideSummary?: boolean;
  hidePageSize?: boolean;
  /** 페이지 번호 버튼 양옆 형제 개수 */
  siblingCount?: number;
}

/**
 * 목록 공통 페이지네이션.
 * Refine: `pagination: toRefinePaginationOptions(current, pageSize)` + total은 query.data.total
 */
export const Pagination: React.FC<PaginationProps> = ({
  current,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  disabled = false,
  className = '',
  hideSummary = false,
  hidePageSize = false,
  siblingCount = 1,
}) => {
  const pageCount = computePageCount(total, pageSize);
  const page = clampPage(current, pageCount);
  const { from, to } = computeItemRange(page, pageSize, total);
  const window = computePageWindow(page, pageCount, siblingCount);
  const showPageSize = !hidePageSize && typeof onPageSizeChange === 'function';

  if (total <= 0 && pageCount <= 1 && !showPageSize) {
    return null;
  }

  return (
    <nav
      aria-label={PAGINATION_COPY.navLabel}
      className={`flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      {!hideSummary ? (
        <p className="text-xs font-medium text-slate-500 tabular-nums" aria-live="polite">
          {PAGINATION_COPY.summary(from, to, total)}
        </p>
      ) : (
        <span className="hidden sm:block" />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {showPageSize ? (
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <span className="hidden sm:inline">{PAGINATION_COPY.pageSizeLabel}</span>
            <select
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              value={pageSize}
              disabled={disabled}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label={PAGINATION_COPY.pageSizeLabel}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {PAGINATION_COPY.pageSizeOption(size)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="inline-flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-md"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label={PAGINATION_COPY.prev}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>

          <div className="hidden items-center gap-1 sm:inline-flex">
            {window.map((token, idx) =>
              token === 'ellipsis' ? (
                <span
                  key={`e-${idx}`}
                  className="px-1 text-xs font-bold text-slate-400"
                  aria-hidden
                >
                  …
                </span>
              ) : (
                <Button
                  key={token}
                  type="button"
                  variant={token === page ? 'primary' : 'ghost'}
                  size="icon-md"
                  disabled={disabled}
                  onClick={() => onPageChange(token)}
                  aria-label={PAGINATION_COPY.page(token)}
                  aria-current={token === page ? 'page' : undefined}
                >
                  {token}
                </Button>
              )
            )}
          </div>

          <span className="min-w-[4.5rem] text-center text-xs font-bold tabular-nums text-slate-700 sm:hidden">
            {page} / {pageCount}
          </span>

          <Button
            type="button"
            variant="outline"
            size="icon-md"
            disabled={disabled || page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            aria-label={PAGINATION_COPY.next}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </nav>
  );
};
