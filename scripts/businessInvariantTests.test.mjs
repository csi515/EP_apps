/**
 * businessInvariantTests 카탈로그 무결성.
 * 실행: npm run test:business-invariants:catalog
 */
import assert from 'node:assert/strict';
import { collectCatalogIntegrityErrors } from './businessInvariantTests.mjs';

const errors = collectCatalogIntegrityErrors();
assert.equal(errors.length, 0, errors.join('\n'));
console.log('businessInvariantTests.test.mjs: ok');
