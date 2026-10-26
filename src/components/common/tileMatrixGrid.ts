export type TileMatrixStatus = 'EMPTY' | 'OCCUPIED' | 'EXPIRING';

export type TileMatrixCell = {
  id: string;
  label?: string;
  status: TileMatrixStatus;
  row: number;
  column: number;
};

export const TILE_STATUS_STYLES: Record<
  TileMatrixStatus,
  { cell: string; badge: string; badgeLabel: string }
> = {
  EMPTY: {
    cell: 'bg-slate-50 border-slate-200 text-slate-500',
    badge: 'bg-slate-200 text-slate-700',
    badgeLabel: '비움',
  },
  OCCUPIED: {
    cell: 'bg-emerald-50 border-emerald-300 text-emerald-900',
    badge: 'bg-emerald-600 text-white',
    badgeLabel: '사용',
  },
  EXPIRING: {
    cell: 'bg-amber-50 border-amber-300 text-amber-950',
    badge: 'bg-amber-500 text-white',
    badgeLabel: '만료임박',
  },
};

/**
 * N×M 격자 셀을 (row, column) 키로 조회하기 위한 맵.
 */
export function indexTileCells(
  cells: readonly TileMatrixCell[]
): Map<string, TileMatrixCell> {
  const map = new Map<string, TileMatrixCell>();
  for (const cell of cells) {
    map.set(`${cell.row}:${cell.column}`, cell);
  }
  return map;
}

export function buildEmptyTileMatrix(
  rows: number,
  columns: number,
  idPrefix = 'tile'
): TileMatrixCell[] {
  const safeRows = Math.max(0, Math.floor(rows));
  const safeCols = Math.max(0, Math.floor(columns));
  const result: TileMatrixCell[] = [];
  for (let r = 0; r < safeRows; r++) {
    for (let c = 0; c < safeCols; c++) {
      result.push({
        id: `${idPrefix}-${r}-${c}`,
        row: r,
        column: c,
        status: 'EMPTY',
        label: `${r + 1}-${c + 1}`,
      });
    }
  }
  return result;
}
