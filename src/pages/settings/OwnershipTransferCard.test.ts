import assert from 'node:assert/strict';
import { OwnershipTransferCard } from './OwnershipTransferCard';

// 1. 컴포넌트 정의 및 export 무결성
assert.equal(typeof OwnershipTransferCard, 'function', 'OwnershipTransferCard must be a React component function');

console.log('OwnershipTransferCard.test.ts: ok');
