import React, { Suspense, lazy } from 'react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const SupplyRestockView = lazy(() =>
  import('@/capabilities/supply_restock').then((m) => ({ default: m.SupplyRestockView })),
);

export const WorkspaceSupplyRestockPage: React.FC = () => (
  <Suspense fallback={<LoadingScreen message="소모품·발주 로딩…" />}>
    <SupplyRestockView />
  </Suspense>
);
