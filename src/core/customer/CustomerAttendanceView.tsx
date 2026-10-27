import type { IndustryType } from '@/core/industry/types';

/** EP_apps: 출결 모듈 제거 */
export function CustomerAttendanceView({
  displayName,
}: {
  customerId: string;
  organizationId: string;
  industryType?: IndustryType | string;
  displayName: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
      {displayName}님의 출결 기록은 이 앱에서 제공하지 않습니다.
    </div>
  );
}
