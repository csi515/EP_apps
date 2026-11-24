/**
 * MBO 월별 체크인 순수 헬퍼 (YYYY-MM SoT)
 */

export function formatPeriodYm(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function isValidPeriodYm(value: string | null | undefined): boolean {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** YYYY-MM → { year, month } */
export function parsePeriodYm(ym: string): { year: number; month: number } | null {
  if (!isValidPeriodYm(ym)) return null;
  const [y, m] = ym.split('-');
  return { year: Number(y), month: Number(m) };
}

function parseDateParts(isoDate: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/**
 * 계획 기간(start~target)에 걸치는 모든 YYYY-MM 목록.
 * 예) 2026-01-01 ~ 2026-03-15 → ['2026-01','2026-02','2026-03']
 * 연말~연초 교차·역순 입력도 처리.
 */
export function listPeriodYmBetween(startDate: string, targetDate: string): string[] {
  const a = parseDateParts(startDate);
  const b = parseDateParts(targetDate);
  if (!a || !b) return [];

  let start = a.year * 12 + (a.month - 1);
  let end = b.year * 12 + (b.month - 1);
  if (start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }

  const out: string[] = [];
  for (let cursor = start; cursor <= end; cursor += 1) {
    const year = Math.floor(cursor / 12);
    const month = (cursor % 12) + 1;
    out.push(`${year}-${String(month).padStart(2, '0')}`);
  }
  return out;
}

/** 프로젝트에 해당 월 체크인(progress log)이 있는지 */
export function hasMonthlyCheckin(
  logs: Array<{ projectId: string; periodYm?: string | null }>,
  projectId: string,
  periodYm: string
): boolean {
  if (!projectId || !isValidPeriodYm(periodYm)) return false;
  return logs.some((l) => l.projectId === projectId && l.periodYm === periodYm);
}

/** 필수 프로젝트 중 해당 월 미제출 목록 */
export function listMissingMonthlyCheckins(
  projectIds: readonly string[],
  logs: Array<{ projectId: string; periodYm?: string | null }>,
  periodYm: string
): string[] {
  if (!isValidPeriodYm(periodYm)) return [...projectIds];
  return projectIds.filter((id) => !hasMonthlyCheckin(logs, id, periodYm));
}
