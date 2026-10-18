import React, { Suspense, type ComponentType } from 'react';
import '@/app/industry/loadIndustryModules';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import {
  hasIndustryModule,
  parseIndustryType,
  isBlankIndustryInput,
  type IndustryType,
} from '@/core/industry/types';
import { resolveIndustryAppKind } from '@/core/industry/industryAppResolve';
import { Navigate } from 'react-router-dom';
import { isSuperAdmin, isDriver, isWorker } from '@/core/authorization';
import { GenericIndustryShell } from './GenericIndustryShell';
import { ParentShell } from '@/modules/parent/ParentShell';
import { DriverDedicatedShell } from './DriverDedicatedShell';
import { WorkerKioskShell } from './WorkerKioskShell';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { PluginErrorBoundary } from '@/shared/components/PluginErrorBoundary';
import { APP_BY_INDUSTRY } from './industryModules';

function resolveIndustryApp(industryType?: string | null): ComponentType {
  if (resolveIndustryAppKind(industryType) === 'generic') return GenericIndustryShell;
  const parsed = parseIndustryType(industryType);
  const moduleIndustry =
    parsed ?? (isBlankIndustryInput(industryType) ? ('piano' as IndustryType) : null);
  if (!moduleIndustry || !hasIndustryModule(moduleIndustry)) return GenericIndustryShell;
  return APP_BY_INDUSTRY[moduleIndustry] ?? GenericIndustryShell;
}

/** organization.industry_type 및 사용자 역할(Role)에 따라 적절한 셸 렌더링 */
export const IndustryAppRouter: React.FC = () => {
  const { currentOrganization, currentRole } = useOrganization();

  // 1. SaaS 최고 운영자(super_admin)는 테넌트 관제 콘솔로 리다이렉트
  if (isSuperAdmin(currentRole as string)) {
    return <Navigate to="/admin/tenants" replace />;
  }

  // 2. 셔틀/배차 기사(driver)는 전용 거치대 모바일 운행표 셸
  if (isDriver(currentRole as string)) {
    return <DriverDedicatedShell />;
  }

  // 3. 현장 작업자(worker)는 공정 파이프라인/SOP 전용 키오스크 셸
  if (isWorker(currentRole as string)) {
    return <WorkerKioskShell />;
  }

  // 4. 학부모(parent) 전용 포털
  if (currentRole === 'parent') {
    return <ParentShell />;
  }

  const IndustryApp = resolveIndustryApp(currentOrganization?.industry_type);
  const industryKey = currentOrganization?.industry_type || 'industry';

  return (
    <PluginErrorBoundary pluginName={industryKey}>
      <Suspense fallback={<LoadingScreen message="화면을 불러오는 중..." />}>
        <IndustryApp />
      </Suspense>
    </PluginErrorBoundary>
  );
};
