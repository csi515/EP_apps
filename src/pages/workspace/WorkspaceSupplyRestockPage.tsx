import React, { Suspense, lazy } from 'react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { SupplyRestockManageGate } from '@/capabilities/supply_restock/ui/SupplyRestockAccessGate';

const SupplyRestockView = lazy(() =>
  import('@/capabilities/supply_restock').then((m) => ({ default: m.SupplyRestockView })),
);

export const WorkspaceSupplyRestockPage: React.FC = () => (
  <SupplyRestockManageGate>
    <Suspense fallback={<LoadingScreen message="소모품·발주 로딩…" />}>
      <SupplyRestockView />
    </Suspense>
  </SupplyRestockManageGate>
);
