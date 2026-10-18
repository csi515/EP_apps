/**
 * PostgreSQL TSTZRANGE 및 시간 범위 유틸리티.
 *
 * 자원 예약, 시설 점검, 대여 슬롯의 시간 범위를 [start, end) 표준 포맷으로 다루고
 * 애플리케이션 레벨의 선제적 중복 감지 및 파싱을 지원합니다.
 */

export interface ParsedTimeRange {
  start: Date;
  end: Date;
  startInclusive: boolean;
  endInclusive: boolean;
}

/**
 * 시작 일시와 종료 일시를 PostgreSQL TSTZRANGE 문자열 ('[start, end)')로 직렬화
 */
export function formatTstzRange(
  start: Date | string,
  end: Date | string,
  options?: { startInclusive?: boolean; endInclusive?: boolean }
): string {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('유효하지 않은 일시 형식입니다.');
  }

  if (startDate >= endDate) {
    throw new Error('종료 일시는 시작 일시보다 이후여야 합니다.');
  }

  const leftBracket = options?.startInclusive !== false ? '[' : '(';
  const rightBracket = options?.endInclusive ? ']' : ')';

  return `${leftBracket}"${startDate.toISOString()}","${endDate.toISOString()}"${rightBracket}`;
}

/**
 * PostgreSQL TSTZRANGE 문자열을 파싱
 */
export function parseTstzRange(rangeStr: string): ParsedTimeRange {
  const trimmed = rangeStr.trim();
  const startInclusive = trimmed.startsWith('[');
  const endInclusive = trimmed.endsWith(']');

  const inner = trimmed.slice(1, -1);
  const parts = inner.split(',').map((s) => s.replace(/^"|"$/g, '').trim());

  if (parts.length !== 2) {
    throw new Error('올바른 TSTZRANGE 형식이 아닙니다.');
  }

  const start = new Date(parts[0]);
  const end = new Date(parts[1]);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('TSTZRANGE 내부의 일시를 파싱할 수 없습니다.');
  }

  return {
    start,
    end,
    startInclusive,
    endInclusive,
  };
}

/**
 * 두 시간 범위의 중복(Overlap) 여부 판정
 */
export function isTimeRangeOverlapping(
  rangeA: string | { start: Date; end: Date },
  rangeB: string | { start: Date; end: Date }
): boolean {
  const a = typeof rangeA === 'string' ? parseTstzRange(rangeA) : rangeA;
  const b = typeof rangeB === 'string' ? parseTstzRange(rangeB) : rangeB;

  // [A.start, A.end) 와 [B.start, B.end) 간의 겹침 조건:
  // A.start < B.end AND A.end > B.start
  return a.start < b.end && a.end > b.start;
}
