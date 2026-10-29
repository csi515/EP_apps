/**
 * 실행: npx tsx src/shared/components/ui/Pagination.test.ts
 */
import assert from 'node:assert/strict';
import {
  clampPage,
  computeItemRange,
  computePageCount,
  computePageWindow,
  toRefinePaginationOptions,
} from './paginationModel';
import { Pagination } from './Pagination';

assert.equal(typeof Pagination, 'function');

assert.equal(computePageCount(0, 20), 1);
assert.equal(computePageCount(20, 20), 1);
assert.equal(computePageCount(21, 20), 2);
assert.equal(computePageCount(100, 0), 1);

assert.equal(clampPage(0, 5), 1);
assert.equal(clampPage(9, 5), 5);
assert.equal(clampPage(3.7, 5), 3);

assert.deepEqual(computeItemRange(1, 20, 0), { from: 0, to: 0 });
assert.deepEqual(computeItemRange(1, 20, 45), { from: 1, to: 20 });
assert.deepEqual(computeItemRange(3, 20, 45), { from: 41, to: 45 });

assert.deepEqual(computePageWindow(1, 3), [1, 2, 3]);
assert.deepEqual(computePageWindow(5, 20, 1), [1, 'ellipsis', 4, 5, 6, 'ellipsis', 20]);
assert.deepEqual(computePageWindow(1, 20, 1), [1, 2, 'ellipsis', 20]);
assert.deepEqual(computePageWindow(20, 20, 1), [1, 'ellipsis', 19, 20]);

assert.deepEqual(toRefinePaginationOptions(2, 50), {
  current: 2,
  pageSize: 50,
  mode: 'server',
});

console.log('Pagination.test.ts: ok');
