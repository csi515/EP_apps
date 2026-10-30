import React, { Suspense, lazy, useMemo } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ClipboardCheck, FlaskConical, Microscope, Sparkles } from 'lucide-react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { StorageService } from '@/services/storage';
import {
  buildCompanyAppAccessInputFromStorageUser,
  canAccessCompanyApp,
} from './companyAppAccess';
import {
  isRndTabEnabled,
  resolveRndEnabledCapabilities,
  resolveRndTabFromPath,
  RND_TAB_LABEL,
  RND_TAB_PATH,
  type RndTab,
} from './rndPortalCapabilities';
import { WorkAppShell } from '@/shared/components/layout/WorkAppShell';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import { CompanyAppAccessDeniedPage } from './CompanyAppAccessDeniedPage';

const ResearchProjectManagementView = lazy(() =>
  import('@/capabilities/research_project').then((m) => ({ default: m.ResearchProjectManagementView })),
);
const PatentAssetManagementView = lazy(() =>
  import('@/capabilities/patent_ip_asset').then((m) => ({ default: m.PatentAssetManagementView })),
);
const MaintenanceChecklistManagementView = lazy(() =>
  import('@/capabilities/maintenance_checklist').then((m) => ({
    default: m.MaintenanceChecklistManagementView,
  })),
);
import { RndEquipmentPortalSection } from './RndEquipmentPortalSection';

const TAB_ICON: Record<RndTab, React.ReactNode> = {
  projects: <FlaskConical className="h-4 w-4" />,
  equipment: <Microscope className="h-4 w-4" />,
  maintenance: <ClipboardCheck className="h-4 w-4" />,
  patents: <Sparkles className="h-4 w-4" />,
};

const RND_TAB_ORDER: readonly RndTab[] = ['projects', 'equipment', 'maintenance', 'patents'];

function RndSectionFallback({ message }: { message: string }) {
  return <LoadingScreen message={message} />;
}

export const RndProjectsSection: React.FC = () => (
  <Suspense fallback={<RndSectionFallback message="연구 프로젝트 로딩…" />}>
    <ResearchProjectManagementView />
  </Suspense>
);

export const RndEquipmentSection: React.FC = () => (
  <Suspense fallback={<RndSectionFallback message="연구 장비 로딩…" />}>
    <RndEquipmentPortalSection />
  </Suspense>
);

export const RndMaintenanceSection: React.FC = () => (
  <Suspense fallback={<RndSectionFallback message="설비 점검 로딩…" />}>
    <MaintenanceChecklistManagementView />
  </Suspense>
);

export const RndPatentsSection: React.FC = () => (
  <Suspense fallback={<RndSectionFallback message="특허 관리 로딩…" />}>
    <PatentAssetManagementView />
  </Suspense>
);

/** 연구소 통합 포털 — WorkAppShell 사이드바로 섹션 전환 */
export const RndPortalPage: React.FC = () => {
  const location = useLocation();
  const { currentOrganization, activeCapabilities } = useOrganization();
  const settings = (currentOrganization?.settings ?? null) as Record<string, unknown> | null;
  const activeUser = StorageService.getActiveUser();
  const appAccess = buildCompanyAppAccessInputFromStorageUser(activeUser);
  const hasPortalAccess = canAccessCompanyApp('research', appAccess);

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
    () => RND_TAB_ORDER.filter((id) => isRndTabEnabled(id, enabledCaps)),
    [enabledCaps],
  );

  const activeTab = resolveRndTabFromPath(location.pathname);
  const defaultPath = visibleTabs[0] ? RND_TAB_PATH[visibleTabs[0]] : '/workspace';

  if (!hasPortalAccess) {
    return <CompanyAppAccessDeniedPage appId="research" />;
  }

  if (visibleTabs.length === 0) {
    return (
      <WorkPageFrame width="form" as="main" className="text-center">
        <p className="text-sm text-slate-600">연구소 포털 모듈이 활성화되지 않았습니다.</p>
      </WorkPageFrame>
    );
  }

  if (location.pathname === '/rnd' || location.pathname === '/rnd/') {
    return <Navigate to={defaultPath} replace />;
  }

  if (activeTab && !visibleTabs.includes(activeTab)) {
    return <Navigate to={defaultPath} replace />;
  }

  return (
    <WorkAppShell
      title="연구소"
      items={RND_TAB_ORDER.map((id) => ({
        to: RND_TAB_PATH[id],
        label: RND_TAB_LABEL[id],
        icon: TAB_ICON[id],
        visible: visibleTabs.includes(id),
        end: true,
      }))}
    >
      <Outlet />
    </WorkAppShell>
  );
};
