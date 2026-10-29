import React, { Suspense, lazy } from 'react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const SupplyRestockView = lazy(() =>
  import('@/capabilities/supply_restock').then((m) => ({ default: m.SupplyRestockView }))
);

/** 소모품·발주 전용 워크스페이스 (런처 딥링크 SSOT) */
export const WorkspaceSupplyRestockPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <Suspense fallback={<LoadingScreen message="소모품·발주 로딩…" />}>
        <SupplyRestockView />
      </Suspense>
    </div>
  );
};
