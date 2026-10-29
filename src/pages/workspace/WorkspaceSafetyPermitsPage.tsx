// @ts-nocheck
import React, { Suspense, lazy } from 'react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const SafetyWorkPermitManagementView = lazy(() =>
  import('@/capabilities/safety_work_permit').then((m) => ({
    default: m.SafetyWorkPermitManagementView,
  }))
);

export const WorkspaceSafetyPermitsPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <Suspense fallback={<LoadingScreen message="안전작업허가서(PTW) 화면 로딩…" />}>
        <SafetyWorkPermitManagementView />
      </Suspense>
    </div>
  );
};
