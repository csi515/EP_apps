import { NOTICE_COPY } from '@/core/notices';

/** EP_apps: 학부모 포털 알림 훅 제거 — 빈 알림함 */
export function CustomerNoticesView({
  compact = false,
}: {
  customerId: string;
  organizationId: string;
  displayName: string;
  compact?: boolean;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
      <h2 className="text-sm font-black text-slate-900">
        {compact ? '최근 알림' : NOTICE_COPY.parentSectionTitle || '알림'}
      </h2>
      <div className="text-center py-6 space-y-1">
        <p className="text-sm font-bold text-slate-700">아직 알림이 없습니다</p>
        <p className="text-xs text-slate-500">보낸 안내가 여기에 표시됩니다</p>
      </div>
    </section>
  );
}
