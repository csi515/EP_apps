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
