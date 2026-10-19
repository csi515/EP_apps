import React from 'react';

function Bone({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}

export function CardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3 lg:hidden" aria-busy="true" aria-label="목록을 불러오는 중">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
          <Bone className="h-4 w-1/3" />
          <Bone className="h-3 w-2/3" />
          <Bone className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white lg:block" aria-busy="true" aria-label="표를 불러오는 중">
      <div className="grid gap-3 border-b bg-slate-50 p-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }, (_, index) => (
          <Bone key={index} className="h-3 w-16" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="grid gap-3 border-b p-4 last:border-b-0" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }, (_, column) => (
            <Bone key={column} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListLoadingSkeleton() {
  return (
    <>
      <CardListSkeleton />
      <TableSkeleton />
    </>
  );
}
