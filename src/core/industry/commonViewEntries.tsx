// @ts-nocheck
import type { ReactNode } from 'react';
import { MyAccountView } from '@/core/account';

/** 동일 허브 화면을 여러 딥링크 탭에 연결 */
export function hubViewAliases(
  render: () => ReactNode,
  tabs: readonly string[]
): Record<string, () => ReactNode> {
  const entries: Record<string, () => ReactNode> = {};
  for (const tab of tabs) entries[tab] = render;
  return entries;
}

/** EP_apps: 레거시 재무 허브 제거 — 플레이스홀더 */
function FinanceUnavailablePlaceholder() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
      재무 허브는 이 앱에서 제공하지 않습니다.
    </div>
  );
}

/** 재무 허브 — 수입·지출·수납·미납·정산 딥링크 탭도 동일 플레이스홀더 */
export const financeViewEntries = hubViewAliases(() => <FinanceUnavailablePlaceholder />, [
  'finance',
  'income',
  'expenses',
  'tuition',
  'unpaid',
  'payroll',
]) as {
  finance: () => ReactNode;
  income: () => ReactNode;
  expenses: () => ReactNode;
  tuition: () => ReactNode;
  unpaid: () => ReactNode;
  payroll: () => ReactNode;
};

/** 고객 허브 — 목록·보호자·등록요청 딥링크 */
export const customerHubTabs = ['students', 'parents', 'enrollment-requests'] as const;

/** 설정 허브 — 사업장·직원·안내·계정 딥링크 */
export const settingsHubTabs = ['settings', 'teachers', 'notices', 'account'] as const;

/** 출결 관리 — EP_apps에서 제거 */
export const attendanceViewEntry = {
  attendance: () => (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
      출결 모듈은 이 앱에서 제공하지 않습니다.
    </div>
  ),
} as const satisfies Record<string, () => ReactNode>;

/** 내 계정 — 모든 역할 공통 */
export const accountViewEntry = {
  account: () => <MyAccountView />,
} as const satisfies Record<string, () => ReactNode>;
