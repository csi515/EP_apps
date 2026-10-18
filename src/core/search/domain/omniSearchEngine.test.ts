/**
 * OmniSearch Engine Unit Tests
 * Run: npx tsx src/core/search/domain/omniSearchEngine.test.ts
 */

import assert from 'node:assert/strict';
import {
  calculateMatchScore,
  filterAndRankOmniSearch,
  groupOmniSearchResultsByCategory,
  type OmniSearchItem,
} from './omniSearchEngine';

console.log('=== [1] calculateMatchScore & Ranking Invariants ===');

const mockItems: OmniSearchItem[] = [
  {
    id: 'c-1',
    category: 'customer',
    title: '김철수',
    subtitle: '010-1234-5678 · 서울초등학교',
    keywords: ['김철수', '01012345678', '피아노기초'],
    url: '/students/c-1',
  },
  {
    id: 'c-2',
    category: 'customer',
    title: '이철수',
    subtitle: '010-9876-5432 · 한국중학교',
    keywords: ['이철수', '01098765432'],
    url: '/students/c-2',
  },
  {
    id: 'p-1',
    category: 'product',
    title: '바이엘 1권 교재',
    subtitle: '상품코드: BK-001 · 15,000원',
    keywords: ['교재', '피아노', '바이엘'],
    url: '/inventory/p-1',
  },
  {
    id: 'pol-1',
    category: 'policy',
    title: '강사 복무 규정 및 휴가 지침',
    subtitle: '연차 신청 절차 및 병가 규정 안내',
    keywords: ['복무규정', '연차', '휴가'],
    url: '/policies/pol-1',
  },
];

// 1.1 완전 일치 점수가 부분 일치보다 높음
const exactScore = calculateMatchScore(mockItems[0], '김철수');
const partialScore = calculateMatchScore(mockItems[0], '철수');
assert.equal(exactScore > partialScore, true);

// 1.2 검색어 랭킹 정렬 검증 ('철수' 검색 시 김철수, 이철수가 상위에 배치)
const rankedResults = filterAndRankOmniSearch(mockItems, '철수');
assert.equal(rankedResults.length, 2);
assert.equal(rankedResults[0].title.includes('철수'), true);
assert.equal(rankedResults[1].title.includes('철수'), true);

// 1.3 전화번호 검색
const phoneResults = filterAndRankOmniSearch(mockItems, '1234');
assert.equal(phoneResults.length, 1);
assert.equal(phoneResults[0].id, 'c-1');

console.log('  -> 옴니서치 점수 계산 및 랭킹 정렬 검증 성공');

console.log('=== [2] Category Grouping Invariants ===');

const grouped = groupOmniSearchResultsByCategory(mockItems);
assert.equal(grouped.customer?.length, 2);
assert.equal(grouped.product?.length, 1);
assert.equal(grouped.policy?.length, 1);

console.log('  -> 카테고리별 그룹화 검증 성공');

console.log('\n[PASS] omniSearchEngine.test.ts: 모든 도메인 불변식 검증 완료');
