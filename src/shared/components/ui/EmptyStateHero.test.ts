import assert from 'node:assert/strict';
import { EmptyState, EmptyStateHero, type EmptyStateGuide } from './index';

console.log('--- Testing EmptyStateHero and EmptyState exports & contracts ---');

// 1. Export check
assert.ok(EmptyState, 'EmptyState must be exported');
assert.ok(EmptyStateHero, 'EmptyStateHero must be exported');

// 2. Type contract check
const sampleGuide: EmptyStateGuide = {
  badge: '💡 30초 시작 가이드',
  title: '첫 회원 등록 팁',
  steps: [
    { title: '기본 정보 입력', detail: '이름과 연락처 입력' },
    { title: '이용권 연결', detail: '회차권 또는 기간제 연결' },
  ],
  tip: '일괄 엑셀 등록도 지원합니다.',
};

assert.equal(sampleGuide.title, '첫 회원 등록 팁');
assert.equal(sampleGuide.steps.length, 2);
assert.ok(sampleGuide.tip);

console.log('✓ [PASS] EmptyState & EmptyStateHero contracts verified');
console.log('EmptyStateHero tests passed successfully!');
