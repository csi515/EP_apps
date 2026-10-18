/**
 * PostgreSQL TSTZRANGE 및 시간 배타 제약(Range Exclusion) 헬퍼 유틸리티
 *
 * Core-Capability-Preset 3계층 아키텍처 원칙을 준수하는 순수 비즈니스 로직.
 * 특정 업종을 몰라야 하며, generic한 시간 범위 표현 및 PostgreSQL 23P01 (exclusion_violation)
 * 더블 부킹 경합 감지 기능을 제공합니다.
 */

export interface ParsedTstzRange {
  start: Date;
  end: Date;
  includesStart: boolean;
  includesEnd: boolean;
}

/**
 * 시작 시간과 종료 시간을 PostgreSQL TSTZRANGE 문자열 '[start, end)' 형태로 변환
 * 기본값: 시작 포함, 종료 미포함 (Half-open interval)
 */
export function toTstzRangeString(
  start: Date | string,
  end: Date | string,
  options: { inclusiveStart?: boolean; inclusiveEnd?: boolean } = {}
): string {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid Date passed to toTstzRangeString');
  }

  if (startDate.getTime() >= endDate.getTime()) {
    throw new Error('Start time must be strictly before end time for a valid range');
  }

  const { inclusiveStart = true, inclusiveEnd = false } = options;
  const leftBracket = inclusiveStart ? '[' : '(';
  const rightBracket = inclusiveEnd ? ']' : ')';

  return `${leftBracket}${startDate.toISOString()},${endDate.toISOString()}${rightBracket}`;
}

/**
 * PostgreSQL TSTZRANGE 문자열을 파싱하여 Date 객체 및 경계 포함 여부 반환
 */
export function parseTstzRangeString(rangeStr: string): ParsedTstzRange {
  if (!rangeStr || typeof rangeStr !== 'string') {
    throw new Error('Invalid range string format');
  }

  const trimmed = rangeStr.trim();
  const leftBracket = trimmed[0];
  const rightBracket = trimmed[trimmed.length - 1];

  if ((leftBracket !== '[' && leftBracket !== '(') || (rightBracket !== ']' && rightBracket !== ')')) {
    throw new Error(`Invalid range brackets: ${rangeStr}`);
  }

  const inner = trimmed.slice(1, -1);
  const parts = inner.split(',');
  if (parts.length !== 2) {
    throw new Error(`Invalid range format (expected 2 parts separated by comma): ${rangeStr}`);
  }

  const startIso = parts[0].replace(/"/g, '').trim();
  const endIso = parts[1].replace(/"/g, '').trim();

  const start = new Date(startIso);
  const end = new Date(endIso);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error(`Failed to parse range dates: ${rangeStr}`);
  }

  return {
    start,
    end,
    includesStart: leftBracket === '[',
    includesEnd: rightBracket === ']',
  };
}

/**
 * 두 시간 범위가 서로 겹치는지(Overlapping, &&) 순수 함수로 검증
 */
export function isRangeOverlapping(rangeAStr: string, rangeBStr: string): boolean {
  const a = parseTstzRangeString(rangeAStr);
  const b = parseTstzRangeString(rangeBStr);

  const aStartMs = a.start.getTime();
  const aEndMs = a.end.getTime();
  const bStartMs = b.start.getTime();
  const bEndMs = b.end.getTime();

  // A가 B보다 완전히 앞서는 경우
  if (aEndMs < bStartMs) return false;
  if (aEndMs === bStartMs && (!a.includesEnd || !b.includesStart)) return false;

  // B가 A보다 완전히 앞서는 경우
  if (bEndMs < aStartMs) return false;
  if (bEndMs === aStartMs && (!b.includesEnd || !a.includesStart)) return false;

  return true;
}

/**
 * PostgreSQL Range 배타 제약 조건 위반 (exclusion_violation, 코드 23P01) 에러 감지
 */
export function isRangeExclusionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as Record<string, unknown>;
  const code = err.code || err.status || '';
  const message = String(err.message || '');
  const details = String(err.details || '');

  // PostgreSQL 에러 코드 23P01 (exclusion_violation)
  if (code === '23P01') {
    return true;
  }

  // Supabase / PostgREST 제약 조건 이름 감지
  if (
    message.includes('no_double_booking') ||
    message.includes('no_resource_double_booking') ||
    message.includes('exclusion_violation') ||
    message.includes('conflicting key value violates exclusion constraint') ||
    details.includes('no_double_booking') ||
    details.includes('no_resource_double_booking')
  ) {
    return true;
  }

  return false;
}

/**
 * 배타 제약 조건 충돌 시 사용자 친화적인 중복 예약 경고 메시지 포맷팅
 */
export function formatDoubleBookingErrorMessage(resourceName?: string): string {
  const target = resourceName ? `[${resourceName}] 자원은` : '해당 자원은';
  return `${target} 이미 다른 사용자가 동일한 시간대에 예약 중이거나 확정되었습니다. 다른 시간대를 선택해 주세요.`;
}
