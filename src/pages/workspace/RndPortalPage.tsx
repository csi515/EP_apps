import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { StorageService } from '@/services/storage';
import { canAccessRndPortal, normalizeRolePermissions } from '@/domain/permissions';
import { AccessDeniedBanner } from '@/pages/settings/DynamicRoleSettingsPage';
import { isRndTabEnabled, resolveRndEnabledCapabilities, type RndTab } from './rndPortalCapabilities';

const ResearchProjectManagementView = lazy(() =>
  import('@/capabilities/research_project').then((m) => ({ default: m.ResearchProjectManagementView })),
);
const PatentAssetManagementView = lazy(() =>
  import('@/capabilities/patent_ip_asset').then((m) => ({ default: m.PatentAssetManagementView })),
);
import { RndEquipmentPortalSection } from './RndEquipmentPortalSection';

const TAB_LABEL: Record<RndTab, string> = {
  projects: '연구 프로젝트',
  equipment: '연구 장비·예약',
  patents: '특허 관리',
};

export const RndPortalPage: React.FC = () => {
  const { currentOrganization, activeCapabilities } = useOrganization();
  const settings = (currentOrganization?.settings ?? null) as Record<string, unknown> | null;
  const activeUser = StorageService.getActiveUser();
  const hasPortalAccess = canAccessRndPortal({
    role: activeUser?.role ?? null,
    permissions: normalizeRolePermissions(activeUser?.customRole?.permissions ?? null) ?? undefined,
    customRole: activeUser?.customRole ?? null,
  });

  const enabledCaps = useMemo(
    () =>
      resolveRndEnabledCapabilities(
        currentOrganization?.industry_type,
        settings,
        activeCapabilities ?? [],
      ),
    [currentOrganization?.industry_type, settings, activeCapabilities],
  );

  const visibleTabs = useMemo(
    () => (Object.keys(TAB_LABEL) as RndTab[]).filter((id) => isRndTabEnabled(id, enabledCaps)),
    [enabledCaps],
  );

  const [tab, setTab] = useState<RndTab>('projects');

  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.includes(tab)) setTab(visibleTabs[0]);
  }, [visibleTabs, tab]);

  if (!hasPortalAccess) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <AccessDeniedBanner />
        <p className="mt-3 text-center text-sm text-slate-600">
          연구소 포털은 권한이 부여된 담당자만 이용할 수 있습니다.
        </p>
      </main>
    );
  }

  if (visibleTabs.length === 0) {
    return (
      <main className="mx-auto max-w-lg p-6 text-center">
        <p className="text-sm text-slate-600">연구소 포털 모듈이 활성화되지 않았습니다.</p>
      </main>
    );
  }

  return (
    <main className="min-h-[100svh] bg-slate-50">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold text-slate-900">연구소 통합 포털</h1>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {visibleTabs.map((id) => (
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
