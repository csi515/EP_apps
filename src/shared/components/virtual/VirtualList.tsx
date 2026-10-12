import React, { useState, useRef, useEffect, useCallback, type UIEvent } from 'react';

/**
 * VirtualList: 가상 스크롤 렌더러
 * 
 * 보급형 태블릿 메모리 크래시 방어:
 * 수천 건의 로그, 원생, 출결 목록 렌더링 시 브라우저 DOM 트리에
 * 뷰포트 영역의 요소만 선별 렌더링하고 나머지는 가상 패딩으로 대체하여 DOM 노드 폭증과 메모리 누수를 원천 차단함.
 */

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  className?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string | number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 4,
  className = '',
  renderItem,
  keyExtractor = (_, idx) => idx,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalCount = items.length;
  const totalHeight = totalCount * itemHeight;

  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan;
  const endIndex = Math.min(totalCount, startIndex + visibleCount);

  const visibleItems = items.slice(startIndex, endIndex);
  const topPadding = startIndex * itemHeight;
  const bottomPadding = Math.max(0, totalHeight - endIndex * itemHeight);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-y-auto relative ${className}`}
      style={{ height: containerHeight }}
    >
      <div style={{ height: topPadding }} />
      {visibleItems.map((item, index) => {
        const actualIndex = startIndex + index;
        return (
          <div
            key={keyExtractor(item, actualIndex)}
            style={{ height: itemHeight }}
            className="w-full box-border"
          >
            {renderItem(item, actualIndex)}
          </div>
        );
      })}
      <div style={{ height: bottomPadding }} />
    </div>
  );
}
