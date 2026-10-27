import React from 'react';
import { CustomerNoticesView } from './CustomerNoticesView';
import type { getMyPassSummary } from './services/studentPortalService';

type PassSummary = ReturnType<typeof getMyPassSummary>;

/** EP_apps: 학원 재무·출결 홈 제거 — 알림만 유지 */
export function CustomerHomeView({
  customerId,
  organizationId,
  displayName,
}: {
  customerId: string;
  studentId: string;
  organizationId: string;
  passSummary: PassSummary;
  onOpenAttendance?: () => void;
  displayName?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        회원 홈의 수납·출결 요약은 이 앱에서 제공하지 않습니다.
      </div>
      <CustomerNoticesView
        organizationId={organizationId}
        customerId={customerId}
        displayName={displayName || '회원'}
      />
    </div>
  );
}
