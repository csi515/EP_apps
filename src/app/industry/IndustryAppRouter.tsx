import React, { Suspense, lazy, type ComponentType } from 'react';
import '@/app/industry/loadIndustryModules';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import {
  hasIndustryModule,
  parseIndustryType,
} from '@/core/industry/types';
import { resolveIndustryAppKind } from '@/core/industry/industryAppResolve';
import { Navigate } from 'react-router-dom';
import { isSuperAdmin, isDriver, isWorker } from '@/core/authorization';
import { GenericIndustryShell } from './GenericIndustryShell';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { PluginErrorBoundary } from '@/shared/components/PluginErrorBoundary';
import { APP_BY_INDUSTRY } from './industryModules';
import { resolveModuleIndustryId } from './resolveModuleIndustry';

const DriverDedicatedShell = lazy(() =>
  import('./DriverDedicatedShell').then((m) => ({ default: m.DriverDedicatedShell }))
);
const WorkerKioskShell = lazy(() =>
  import('./WorkerKioskShell').then((m) => ({ default: m.WorkerKioskShell }))
);

function resolveIndustryApp(industryType?: string | null): ComponentType {
  const boundModule = resolveModuleIndustryId(industryType);
  if (boundModule && APP_BY_INDUSTRY[boundModule]) {
    return APP_BY_INDUSTRY[boundModule];
  }
  if (resolveIndustryAppKind(industryType) === 'generic') return GenericIndustryShell;
  const parsed = parseIndustryType(industryType);
  if (!parsed || !hasIndustryModule(parsed)) return GenericIndustryShell;
  return APP_BY_INDUSTRY[parsed] ?? GenericIndustryShell;
}

/** organization.industry_type 및 사용자 역할(Role)에 따라 적절한 셸 렌더링 */
export const IndustryAppRouter: React.FC = () => {
  const { currentOrganization, currentRole } = useOrganization();

  if (isSuperAdmin(currentRole as string)) {
    return <Navigate to="/admin/tenants" replace />;
  }

  if (isDriver(currentRole as string)) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <DriverDedicatedShell />
      </Suspense>
    );
  }

  if (isWorker(currentRole as string)) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <WorkerKioskShell />
      </Suspense>
    );
  }

  const IndustryApp = resolveIndustryApp(currentOrganization?.industry_type);
  const industryKey = currentOrganization?.industry_type || 'personal_plant_ops';

  return (
    <PluginErrorBoundary pluginName={industryKey}>
      <Suspense fallback={<LoadingScreen message="화면을 불러오는 중..." />}>
        <IndustryApp />
      </Suspense>
    </PluginErrorBoundary>
  );
};
