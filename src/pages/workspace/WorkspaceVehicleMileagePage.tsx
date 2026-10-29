// @ts-nocheck
import React, { Suspense, lazy } from 'react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const VehicleMileageLogManagementView = lazy(() =>
  import('@/capabilities/vehicle_mileage_log').then((m) => ({
    default: m.VehicleMileageLogManagementView,
  }))
);

export const WorkspaceVehicleMileagePage: React.FC = () => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <Suspense fallback={<LoadingScreen message="업무용 승용차 운행기록부 로딩…" />}>
        <VehicleMileageLogManagementView />
      </Suspense>
    </div>
  );
};
