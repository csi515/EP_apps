import React, { Suspense, lazy } from 'react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const InventoryManagementView = lazy(() =>
  import('@/capabilities/inventory/components/InventoryManagementView').then((m) => ({
    default: m.InventoryManagementView,
  }))
);

/** 현장 자재 전용 워크스페이스 (런처 딥링크 SSOT) */
export const WorkspaceInventoryPage: React.FC = () => (
  <Suspense fallback={<LoadingScreen message="현장 자재 로딩…" />}>
    <InventoryManagementView title="현장 자재·재고" />
  </Suspense>
);
