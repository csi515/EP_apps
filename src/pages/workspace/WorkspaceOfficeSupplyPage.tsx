import React, { Suspense, lazy } from 'react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const OfficeSupplyMyView = lazy(() =>
  import('@/capabilities/office_supply_request').then((m) => ({ default: m.OfficeSupplyMyView })),
);
const OfficeSupplyManagePage = lazy(() =>
  import('@/capabilities/office_supply_request').then((m) => ({
    default: m.OfficeSupplyManagePage,
  })),
);
const OfficeSupplyCatalogPage = lazy(() =>
  import('@/capabilities/office_supply_request').then((m) => ({
    default: m.OfficeSupplyCatalogPage,
  })),
);

export const WorkspaceOfficeSupplyMyPage: React.FC = () => (
  <Suspense fallback={<LoadingScreen message="사무용품 신청 로딩…" />}>
    <OfficeSupplyMyView />
  </Suspense>
);

export const WorkspaceOfficeSupplyManagePage: React.FC = () => (
  <Suspense fallback={<LoadingScreen message="사무용품 취합 로딩…" />}>
    <OfficeSupplyManagePage />
  </Suspense>
);

export const WorkspaceOfficeSupplyCatalogPage: React.FC = () => (
  <Suspense fallback={<LoadingScreen message="구매 품목 로딩…" />}>
    <OfficeSupplyCatalogPage />
  </Suspense>
);
