/**
 * 간트 표시 구간 (YYYY-MM-DD) — 디폴트는 이번 달 초~말
 */

export type MboGanttVisibleRange = {
  startDate: string;
  endDate: string;
};

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIsoDate(iso: string): Date | null {
  const s = (iso || '').slice(0, 10);
  if (s.length < 10) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 지정 연·월(1–12)의 1일~말일 */
export function monthVisibleRange(year: number, month: number): MboGanttVisibleRange {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
}

/** 이번 달 1일 ~ 말일 */
export function currentMonthVisibleRange(now = new Date()): MboGanttVisibleRange {
  return monthVisibleRange(now.getFullYear(), now.getMonth() + 1);
}

/** 디폴트 표시 구간: 올해 1/1 ~ 12/31 (연간 과제 일정이 구분되도록) */
export function currentYearVisibleRange(now = new Date()): MboGanttVisibleRange {
  const y = now.getFullYear();
  return { startDate: `${y}-01-01`, endDate: `${y}-12-31` };
}

/**
 * [start, end]와 [rangeStart, rangeEnd]가 하루라도 겹치면 true.
 * 날짜가 비어 있으면 표시 대상으로 포함(미설정 일정).
 */
export function datesOverlapRange(
  start: string,
  end: string,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  const rs = parseIsoDate(rangeStart);
  const re = parseIsoDate(rangeEnd);
  if (!rs || !re) return true;

  const s = parseIsoDate(start);
  const e = parseIsoDate(end);
  if (!s && !e) return true;
  const a = s ?? e!;
  const b = e ?? s!;
  const from = a <= b ? a : b;
  const to = a <= b ? b : a;
  return from <= re && to >= rs;
}

/** start > end이면 스왑한 정규화 구간 */
export function normalizeVisibleRange(range: MboGanttVisibleRange): MboGanttVisibleRange {
  const a = (range.startDate || '').slice(0, 10);
  const b = (range.endDate || '').slice(0, 10);
  if (!a && !b) return currentYearVisibleRange();
  if (!a) return { startDate: b, endDate: b };
  if (!b) return { startDate: a, endDate: a };
  return a <= b ? { startDate: a, endDate: b } : { startDate: b, endDate: a };
}

/**
 * 과제 일정을 표시 구간에 클립. 겹침 없으면 null.
 * 빈 날짜는 ensure 전제 — 호출 측에서 정규화한 YYYY-MM-DD를 넘긴다.
 */
export function clipDateRangeToVisible(
  start: string,
  end: string,
  visibleRange: MboGanttVisibleRange,
): { start: string; end: string } | null {
  const range = normalizeVisibleRange(visibleRange);
  const s = (start || '').slice(0, 10);
  const e = (end || '').slice(0, 10);
  if (!s || !e) return null;
  const from = s <= e ? s : e;
  const to = s <= e ? e : s;
  if (to < range.startDate || from > range.endDate) return null;
  return {
    start: from < range.startDate ? range.startDate : from,
    end: to > range.endDate ? range.endDate : to,
  };
}

/** 오늘이 구간 안이면 true */
export function isTodayInVisibleRange(range: MboGanttVisibleRange, now = new Date()): boolean {
  const today = toIsoDate(now);
  const n = normalizeVisibleRange(range);
  return today >= n.startDate && today <= n.endDate;
}
