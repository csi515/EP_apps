import React, { Suspense, lazy, useState } from 'react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const ResearchProjectManagementView = lazy(() =>
  import('@/capabilities/research_project').then((m) => ({ default: m.ResearchProjectManagementView })),
);
const PatentAssetManagementView = lazy(() =>
  import('@/capabilities/patent_ip_asset').then((m) => ({ default: m.PatentAssetManagementView })),
);
import { RndEquipmentPortalSection } from './RndEquipmentPortalSection';

type RndTab = 'projects' | 'equipment' | 'patents';

const TAB_LABEL: Record<RndTab, string> = {
  projects: '연구 프로젝트',
  equipment: '연구 장비·예약',
  patents: '특허 관리',
};

export const RndPortalPage: React.FC = () => {
  const [tab, setTab] = useState<RndTab>('projects');

  return (
    <main className="min-h-[100svh] bg-slate-50">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <h1 className="text-lg font-semibold text-slate-900">연구소 통합 포털</h1>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {(Object.keys(TAB_LABEL) as RndTab[]).map((id) => (
            <button
              key={id}
              type="button"
              className={`min-h-12 shrink-0 rounded-xl px-4 text-sm font-medium ${
                tab === id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
              onClick={() => setTab(id)}
            >
              {TAB_LABEL[id]}
            </button>
          ))}
        </div>
      </div>
      <Suspense fallback={<LoadingScreen message="연구소 화면 로딩…" />}>
        {tab === 'projects' ? <ResearchProjectManagementView /> : null}
        {tab === 'equipment' ? <RndEquipmentPortalSection /> : null}
        {tab === 'patents' ? <PatentAssetManagementView /> : null}
      </Suspense>
    </main>
  );
};
