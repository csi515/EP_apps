/**
 * Universal Activity Stream Engine Unit Tests
 * Run: npx tsx src/core/activities/domain/activityStreamEngine.test.ts
 */

import assert from 'node:assert/strict';
import {
  formatActivityTypeBadge,
  filterAndSortActivities,
  groupActivitiesByDate,
  type ActivityRecord,
} from './activityStreamEngine';

console.log('=== [1] formatActivityTypeBadge UI mapping ===');

const createdBadge = formatActivityTypeBadge('created');
assert.equal(createdBadge.label, '신규 등록');
assert.match(createdBadge.colorClass, /emerald/);

const paymentBadge = formatActivityTypeBadge('payment');
assert.equal(paymentBadge.label, '결제/과금');
assert.match(paymentBadge.colorClass, /amber/);

const statusBadge = formatActivityTypeBadge('status_changed');
assert.equal(statusBadge.label, '상태 전이');

console.log('  -> 활동 유형 배지 매핑 검증 성공');

console.log('=== [2] filterAndSortActivities Invariants ===');

const mockActivities: ActivityRecord[] = [
  {
    id: 'act-1',
    organizationId: 'org-1',
    actorName: '김상담 실장',
    targetType: 'customer',
    targetId: 'cust-101',
    activityType: 'consultation',
    title: '신규 입학 1차 유선 상담',
    content: '주 3회 수업 희망 및 피아노 기초 레벨 진단',
    createdAt: '2026-10-16T10:00:00Z',
  },
  {
    id: 'act-2',
    organizationId: 'org-1',
    actorName: '이지원 매니저',
    targetType: 'customer',
    targetId: 'cust-101',
    activityType: 'payment',
    title: '10월 수강료 카드 결제 완료',
    content: '결제 금액: 250,000원',
    createdAt: '2026-10-17T14:30:00Z',
  },
  {
    id: 'act-3',
    organizationId: 'org-1',
    actorName: '박원장',
    targetType: 'customer',
    targetId: 'cust-102',
    activityType: 'created',
    title: '고객 정보 등록',
    createdAt: '2026-10-18T09:00:00Z',
  },
];

// 2.1 대상 ID 필터링
const cust101Activities = filterAndSortActivities(mockActivities, {
  targetType: 'customer',
  targetId: 'cust-101',
});
assert.equal(cust101Activities.length, 2);
// 최신순 정렬 확인 (act-2가 10-17이므로 act-1 10-16보다 먼저)
assert.equal(cust101Activities[0].id, 'act-2');
assert.equal(cust101Activities[1].id, 'act-1');

// 2.2 검색 쿼리 필터링
const searchResults = filterAndSortActivities(mockActivities, { query: '수강료' });
assert.equal(searchResults.length, 1);
assert.equal(searchResults[0].id, 'act-2');

console.log('  -> 다형성 대상 필터링 및 최신순 정렬 검증 성공');

console.log('=== [3] groupActivitiesByDate Invariants ===');

const grouped = groupActivitiesByDate(mockActivities);
assert.equal(Object.keys(grouped).length, 3);
assert.equal(grouped['2026-10-16'].length, 1);
assert.equal(grouped['2026-10-17'].length, 1);
assert.equal(grouped['2026-10-18'].length, 1);

console.log('  -> 일자별 타임라인 그룹화 검증 성공');

console.log('\n[PASS] activityStreamEngine.test.ts: 모든 도메인 불변식 검증 완료');
