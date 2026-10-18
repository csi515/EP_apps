import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTstzRange,
  parseTstzRange,
  isTimeRangeOverlapping,
} from './temporalRange';

describe('Temporal Range Engine (Phase 1)', () => {
  it('시작/종료 일시를 TSTZRANGE 문자열로 정확히 포맷팅한다', () => {
    const start = '2026-10-18T10:00:00.000Z';
    const end = '2026-10-18T12:00:00.000Z';

    const range = formatTstzRange(start, end);
    assert.equal(range, `["${start}","${end}")`);
  });

  it('종료 일시가 시작보다 앞서거나 같으면 에러를 던진다', () => {
    assert.throws(() => {
      formatTstzRange('2026-10-18T12:00:00Z', '2026-10-18T10:00:00Z');
    }, /종료 일시는 시작 일시보다 이후여야 합니다/);
  });

  it('TSTZRANGE 문자열을 Date 객체로 정확히 파싱한다', () => {
    const raw = '["2026-10-18T09:00:00.000Z","2026-10-18T11:00:00.000Z")';
    const parsed = parseTstzRange(raw);

    assert.equal(parsed.start.toISOString(), '2026-10-18T09:00:00.000Z');
    assert.equal(parsed.end.toISOString(), '2026-10-18T11:00:00.000Z');
    assert.equal(parsed.startInclusive, true);
    assert.equal(parsed.endInclusive, false);
  });

  it('두 시간 범위의 겹침(Overlap)을 정확히 판정한다', () => {
    // A: 10:00 ~ 12:00
    const rangeA = formatTstzRange('2026-10-18T10:00:00Z', '2026-10-18T12:00:00Z');

    // B1: 11:00 ~ 13:00 (겹침)
    const rangeB1 = formatTstzRange('2026-10-18T11:00:00Z', '2026-10-18T13:00:00Z');
    assert.equal(isTimeRangeOverlapping(rangeA, rangeB1), true);

    // B2: 12:00 ~ 14:00 (경계 접촉, [10, 12) 와 [12, 14) 는 안 겹침)
    const rangeB2 = formatTstzRange('2026-10-18T12:00:00Z', '2026-10-18T14:00:00Z');
    assert.equal(isTimeRangeOverlapping(rangeA, rangeB2), false);

    // B3: 08:00 ~ 09:30 (완전 분리)
    const rangeB3 = formatTstzRange('2026-10-18T08:00:00Z', '2026-10-18T09:30:00Z');
    assert.equal(isTimeRangeOverlapping(rangeA, rangeB3), false);
  });
});
