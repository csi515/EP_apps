import assert from 'node:assert/strict';
import { customerNameFilter, isChosungQuery } from './chosungSearch';

assert.equal(isChosungQuery('ㄱㄴ'), true);
assert.equal(isChosungQuery('김'), false);
assert.deepEqual(customerNameFilter('ㄱㄴ'), { column: 'chosung', value: 'ㄱㄴ%' });
assert.deepEqual(customerNameFilter('김'), { column: 'name', value: '%김%' });

console.log('chosungSearch.test.ts: ok');
