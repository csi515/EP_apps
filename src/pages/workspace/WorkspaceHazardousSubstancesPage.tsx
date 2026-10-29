import React, { Suspense, lazy } from 'react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const HazardousSubstanceManagementView = lazy(() =>
  import('@/capabilities/hazardous_substance_msds').then((m) => ({
    default: m.HazardousSubstanceManagementView,
  }))
);

export const WorkspaceHazardousSubstancesPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <Suspense fallback={<LoadingScreen message="화학시약 및 MSDS 대장 로딩…" />}>
        <HazardousSubstanceManagementView />
      </Suspense>
    </div>
  );
};
