import React, { useMemo } from 'react';
import {
  indexTileCells,
  TILE_STATUS_STYLES,
  type TileMatrixCell,
  type TileMatrixStatus,
} from './tileMatrixGrid';

export type TileMatrixGridProps = {
  rows: number;
  columns: number;
  cells: TileMatrixCell[];
  onCellClick?: (cell: TileMatrixCell) => void;
  className?: string;
  emptyLabel?: string;
};

function resolveCell(
  map: Map<string, TileMatrixCell>,
  row: number,
  column: number
): TileMatrixCell {
  const existing = map.get(`${row}:${column}`);
  if (existing) return existing;
  return {
    id: `empty-${row}-${column}`,
    row,
    column,
    status: 'EMPTY' as TileMatrixStatus,
    label: `${row + 1}-${column + 1}`,
  };
}

/**
 * 도메인 비종속 N×M 타일 매트릭스. 상태는 색상·뱃지로만 표현한다.
 */
export function TileMatrixGrid({
  rows,
  columns,
  cells,
  onCellClick,
  className = '',
  emptyLabel = '비움',
}: TileMatrixGridProps) {
  const map = useMemo(() => indexTileCells(cells), [cells]);
  const safeRows = Math.max(0, Math.floor(rows));
  const safeCols = Math.max(0, Math.floor(columns));

  if (safeRows === 0 || safeCols === 0) {
    return (
      <div className={`rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 ${className}`}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <div
      className={`grid gap-2 ${className}`}
      style={{ gridTemplateColumns: `repeat(${safeCols}, minmax(0, 1fr))` }}
      role="grid"
      aria-rowcount={safeRows}
      aria-colcount={safeCols}
    >
      {Array.from({ length: safeRows }, (_, row) =>
        Array.from({ length: safeCols }, (_, column) => {
          const cell = resolveCell(map, row, column);
          const style = TILE_STATUS_STYLES[cell.status];
          return (
            <button
              key={cell.id}
              type="button"
              role="gridcell"
              aria-rowindex={row + 1}
              aria-colindex={column + 1}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${style.cell} ${
                onCellClick ? 'cursor-pointer hover:brightness-95' : 'cursor-default'
              }`}
              onClick={() => onCellClick?.(cell)}
            >
              <span className="font-bold">{cell.label ?? `${row + 1}-${column + 1}`}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.badge}`}>
                {style.badgeLabel}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}
