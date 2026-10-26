/**
 * 실행: npx tsx src/components/common/tileMatrixGrid.test.ts
 */
import assert from 'node:assert/strict';
import {
  buildEmptyTileMatrix,
  indexTileCells,
  TILE_STATUS_STYLES,
} from './tileMatrixGrid';

{
  const cells = buildEmptyTileMatrix(2, 3);
  assert.equal(cells.length, 6);
  assert.equal(cells[0].status, 'EMPTY');
  assert.equal(cells[5].row, 1);
  assert.equal(cells[5].column, 2);
}

{
  const cells = buildEmptyTileMatrix(1, 1);
  cells[0].status = 'EXPIRING';
  const map = indexTileCells(cells);
  assert.equal(map.get('0:0')?.status, 'EXPIRING');
  assert.equal(TILE_STATUS_STYLES.EXPIRING.badgeLabel, '만료임박');
}

{
  assert.equal(buildEmptyTileMatrix(0, 5).length, 0);
  assert.equal(buildEmptyTileMatrix(-1, 2).length, 0);
}

console.log('tileMatrixGrid.test.ts: ok');
