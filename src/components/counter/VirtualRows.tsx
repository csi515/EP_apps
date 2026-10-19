import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

type Props<T> = {
  items: T[];
  estimate?: number;
  render: (item: T) => React.ReactNode;
};

export function VirtualRows<T>({ items, estimate = 48, render }: Props<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimate,
  });

  return (
    <div ref={parentRef} className="h-80 overflow-auto rounded-xl border">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((row) => (
          <div
            key={row.key}
            className="absolute left-0 top-0 w-full px-3"
            style={{ height: row.size, transform: `translateY(${row.start}px)` }}
          >
            {render(items[row.index])}
          </div>
        ))}
      </div>
    </div>
  );
}
