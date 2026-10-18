/**
 * RangeHelper & Double Booking Prevention Unit Tests
 * Run: npx tsx src/core/schedules/rangeHelper.test.ts
 */

import assert from 'node:assert/strict';
import {
  toTstzRangeString,
  parseTstzRangeString,
  isRangeOverlapping,
  isRangeExclusionError,
  formatDoubleBookingErrorMessage,
} from './rangeHelper';

console.log('=== [1] toTstzRangeString formatting ===');

const start = new Date('2026-10-18T10:00:00.000Z');
const end = new Date('2026-10-18T11:00:00.000Z');

// 1.1 기본 [start, end)
const standardRange = toTstzRangeString(start, end);
assert.equal(standardRange, '[2026-10-18T10:00:00.000Z,2026-10-18T11:00:00.000Z)');

// 1.2 [start, end]
const closedRange = toTstzRangeString(start, end, { inclusiveEnd: true });
assert.equal(closedRange, '[2026-10-18T10:00:00.000Z,2026-10-18T11:00:00.000Z]');

// 1.3 시작시간이 종료시간 이상인 경우 차단
assert.throws(() => {
  toTstzRangeString(end, start);
}, /Start time must be strictly before end time/);

console.log('  -> Range 문자열 변환 검증 성공');

console.log('=== [2] parseTstzRangeString parsing ===');

const parsed = parseTstzRangeString('[2026-10-18T10:00:00.000Z,2026-10-18T11:00:00.000Z)');
assert.equal(parsed.start.toISOString(), '2026-10-18T10:00:00.000Z');
assert.equal(parsed.end.toISOString(), '2026-10-18T11:00:00.000Z');
assert.equal(parsed.includesStart, true);
assert.equal(parsed.includesEnd, false);

console.log('  -> Range 문자열 파싱 검증 성공');

console.log('=== [3] isRangeOverlapping detection ===');

// 3.1 10:00~11:00 과 10:30~11:30 (겹침)
assert.equal(
  isRangeOverlapping(
    '[2026-10-18T10:00:00.000Z,2026-10-18T11:00:00.000Z)',
    '[2026-10-18T10:30:00.000Z,2026-10-18T11:30:00.000Z)'
  ),
  true
);

// 3.2 10:00~11:00 과 11:00~12:00 (연접, half-open interval이므로 안 겹침)
assert.equal(
  isRangeOverlapping(
    '[2026-10-18T10:00:00.000Z,2026-10-18T11:00:00.000Z)',
    '[2026-10-18T11:00:00.000Z,2026-10-18T12:00:00.000Z)'
  ),
  false
);

// 3.3 10:00~11:00 과 12:00~13:00 (완전 분리, 안 겹침)
assert.equal(
  isRangeOverlapping(
    '[2026-10-18T10:00:00.000Z,2026-10-18T11:00:00.000Z)',
    '[2026-10-18T12:00:00.000Z,2026-10-18T13:00:00.000Z)'
  ),
  false
);

console.log('  -> 시간 범위 중복 판정 알고리즘 검증 성공');

console.log('=== [4] isRangeExclusionError & Error formatting ===');

// 4.1 PostgreSQL 23P01 코드 감지
assert.equal(isRangeExclusionError({ code: '23P01', message: 'exclusion violation' }), true);

// 4.2 Supabase 제약 조건 위반 감지
assert.equal(
  isRangeExclusionError({
    message: 'conflicting key value violates exclusion constraint "no_double_booking"',
  }),
  true
);

// 4.3 범용 자원 예약 제약 조건 감지
assert.equal(
  isRangeExclusionError({
    message: 'conflicting key value violates exclusion constraint "no_resource_double_booking"',
  }),
  true
);

// 4.4 일반 에러는 false
assert.equal(isRangeExclusionError({ code: '23505', message: 'unique violation' }), false);
assert.equal(isRangeExclusionError(null), false);

// 4.5 사용자 친화적 메시지
const msg = formatDoubleBookingErrorMessage('1호 피아노 연습실');
assert.match(msg, /\[1호 피아노 연습실\] 자원은 이미 다른 사용자가 동일한 시간대에 예약 중/);

console.log('  -> 배타 제약 충돌 감지 및 안내 포맷팅 검증 성공');

console.log('\n[PASS] rangeHelper.test.ts: 모든 불변식 검증 완료');
