import React, { Suspense, lazy, useState } from 'react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const EquipmentLifecycleManagementView = lazy(() =>
  import('@/capabilities/equipment_lifecycle').then((m) => ({ default: m.EquipmentLifecycleManagementView })),
);
const BookingCalendarView = lazy(() =>
  import('@/capabilities/booking/ui/BookingCalendarView').then((m) => ({ default: m.BookingCalendarView })),
);
const TaskPipelineKanbanView = lazy(() =>
  import('@/capabilities/task_pipeline').then((m) => ({ default: m.TaskPipelineKanbanView })),
);

type EquipmentTab = 'assets' | 'booking' | 'pipeline';

const LABELS: Record<EquipmentTab, string> = {
  assets: '계측·장비 자산',
  booking: '장비·실험실 예약',
  pipeline: '공정 파이프라인',
};

/** 연구소 포털 — 장비·예약·공정 세그먼트 */
export const RndEquipmentPortalSection: React.FC = () => {
  const [subTab, setSubTab] = useState<EquipmentTab>('assets');

  return (
    <div className="bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex gap-2 overflow-x-auto">
          {(Object.keys(LABELS) as EquipmentTab[]).map((id) => (
            <button
              key={id}
              type="button"
              className={`min-h-12 shrink-0 rounded-lg px-3 text-sm font-medium ${
                subTab === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
              onClick={() => setSubTab(id)}
            >
              {LABELS[id]}
            </button>
          ))}
        </div>
      </div>
      <Suspense fallback={<LoadingScreen message="장비 화면 로딩…" />}>
        {subTab === 'assets' ? <EquipmentLifecycleManagementView /> : null}
        {subTab === 'booking' ? <BookingCalendarView /> : null}
        {subTab === 'pipeline' ? <TaskPipelineKanbanView /> : null}
      </Suspense>
    </div>
  );
};
