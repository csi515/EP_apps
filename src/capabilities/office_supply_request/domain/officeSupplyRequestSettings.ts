/**
 * 조직 settings에서 사무용품 setupSchema 값을 읽는다.
 * 온보딩 키: office_supply_request_<fieldId> / nested office_supply_request 객체 모두 지원.
 */

export type OfficeSupplyRuntimeSettings = {
  /** 매월 신청 마감 일자(1~28 권장, 월말 클램프) */
  monthlyCutoffDay: number;
  /**
   * 1인당 월별 신청 한도(원).
   * null/0 이하면 한도 미적용.
   */
  maxMonthlyBudgetPerUser: number | null;
};

const DEFAULTS: OfficeSupplyRuntimeSettings = {
  monthlyCutoffDay: 25,
  maxMonthlyBudgetPerUser: 50000,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toDayOfMonth(value: unknown, fallback: number): number {
  let n: number | null = null;
  if (typeof value === 'number' && Number.isFinite(value)) n = Math.floor(value);
  else if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) n = Math.floor(parsed);
  }
  if (n == null) return fallback;
  return Math.min(28, Math.max(1, n));
}

function toBudgetOrNull(value: unknown, fallback: number | null): number | null {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = Math.floor(value);
    return n > 0 ? n : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    const floor = Math.floor(n);
    return floor > 0 ? floor : null;
  }
  return fallback;
}

function pickNested(
  nested: Record<string, unknown>,
  camel: string,
  snake: string
): unknown {
  return nested[camel] ?? nested[snake];
}

export function readOfficeSupplyRequestSettings(
  settings: Record<string, unknown> | null | undefined
): OfficeSupplyRuntimeSettings {
  const root = settings ?? {};
  const nested =
    asRecord(root.office_supply_request) ||
    asRecord(asRecord(root.capability_setup)?.office_supply_request) ||
    {};

  return {
    monthlyCutoffDay: toDayOfMonth(
      pickNested(nested, 'monthlyCutoffDay', 'monthly_cutoff_day') ??
        root.office_supply_request_monthlyCutoffDay ??
        root.office_supply_request_monthly_cutoff_day,
      DEFAULTS.monthlyCutoffDay
    ),
    maxMonthlyBudgetPerUser: toBudgetOrNull(
      pickNested(nested, 'maxMonthlyBudgetPerUser', 'max_monthly_budget_per_user') ??
        root.office_supply_request_maxMonthlyBudgetPerUser ??
        root.office_supply_request_max_monthly_budget_per_user,
      DEFAULTS.maxMonthlyBudgetPerUser
    ),
  };
}
