import React, { Suspense, lazy, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const EquipmentLifecycleManagementView = lazy(() =>
  import('@/capabilities/equipment_lifecycle').then((m) => ({ default: m.EquipmentLifecycleManagementView })),
);
const UniversalResourceCalendarView = lazy(() =>
  import('@/capabilities/resources').then((m) => ({ default: m.UniversalResourceCalendarView })),
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

/** 연구소 포털 — 장비·공용자원 예약·공정 (설비 점검은 /rnd/maintenance) */
export const RndEquipmentPortalSection: React.FC = () => {
  const [subTab, setSubTab] = useState<EquipmentTab>('assets');

  return (
    <div className="bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
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
          <Link
            to="/workspace/resources"
            className="ml-auto min-h-11 shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            공용자원 허브
          </Link>
        </div>
      </div>
      <Suspense fallback={<LoadingScreen message="장비 화면 로딩…" />}>
        {subTab === 'assets' ? <EquipmentLifecycleManagementView /> : null}
        {subTab === 'booking' ? (
          <div className="p-4">
            <UniversalResourceCalendarView
              compact
              hideApprovalInbox
              hideMasterButton
              bookingMode="member"
            />
          </div>
        ) : null}
        {subTab === 'pipeline' ? <TaskPipelineKanbanView /> : null}
      </Suspense>
    </div>
  );
};
