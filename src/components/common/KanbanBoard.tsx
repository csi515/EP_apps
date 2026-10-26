import React, { useCallback, useMemo, useState } from 'react';
import {
  groupKanbanItemsByColumn,
  moveKanbanCard,
  type KanbanColumn,
  type KanbanItem,
} from './kanbanBoard';

export type KanbanBoardProps<TMeta = unknown> = {
  columns: KanbanColumn[];
  items: KanbanItem<TMeta>[];
  onCardMove: (cardId: string, toColumnId: string) => void;
  className?: string;
  renderCard?: (item: KanbanItem<TMeta>) => React.ReactNode;
};

/**
 * 도메인 비종속 칸반. 포인터 드롭으로 카드 컬럼을 이동한다.
 */
export function KanbanBoard<TMeta = unknown>({
  columns,
  items,
  onCardMove,
  className = '',
  renderCard,
}: KanbanBoardProps<TMeta>) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);
  const grouped = useMemo(
    () => groupKanbanItemsByColumn(columns, items),
    [columns, items]
  );

  const commitMove = useCallback(
    (cardId: string, toColumnId: string) => {
      const next = moveKanbanCard(items, cardId, toColumnId, columnIds);
      const moved = next.find((i) => i.id === cardId);
      const prev = items.find((i) => i.id === cardId);
      if (moved && prev && moved.columnId !== prev.columnId) {
        onCardMove(cardId, toColumnId);
      }
    },
    [columnIds, items, onCardMove]
  );

  return (
    <div
      className={`flex gap-3 overflow-x-auto pb-2 ${className}`}
      onPointerCancel={() => {
        setDraggingId(null);
        setOverColumnId(null);
      }}
    >
      {columns.map((column) => {
        const columnItems = grouped[column.id] ?? [];
        const isOver = overColumnId === column.id;
        return (
          <section
            key={column.id}
            className={`flex w-64 shrink-0 flex-col rounded-2xl border bg-slate-50/80 p-3 ${
              isOver ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'
            }`}
            onPointerEnter={() => {
              if (draggingId) setOverColumnId(column.id);
            }}
            onPointerUp={() => {
              if (draggingId) {
                commitMove(draggingId, column.id);
              }
              setDraggingId(null);
              setOverColumnId(null);
            }}
          >
            <header className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-800">{column.title}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200">
                {columnItems.length}
              </span>
            </header>
            <ul className="flex min-h-[120px] flex-col gap-2">
              {columnItems.map((item) => (
                <li key={item.id}>
                  <article
                    role="listitem"
                    tabIndex={0}
                    draggable={false}
                    className={`min-h-[44px] cursor-grab rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm active:cursor-grabbing touch-none ${
                      draggingId === item.id ? 'opacity-60 ring-2 ring-indigo-300' : ''
                    }`}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      setDraggingId(item.id);
                    }}
                    onPointerUp={() => {
                      if (draggingId && overColumnId) {
                        commitMove(draggingId, overColumnId);
                      }
                      setDraggingId(null);
                      setOverColumnId(null);
                    }}
                  >
                    {renderCard ? renderCard(item) : item.title}
                  </article>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
