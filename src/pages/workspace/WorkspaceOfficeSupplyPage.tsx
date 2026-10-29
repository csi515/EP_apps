import React, { Suspense, lazy, type ReactNode } from 'react';
import { ClipboardCheck, Package, PackageOpen } from 'lucide-react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { WorkAppShell } from '@/shared/components/layout/WorkAppShell';
import { useOfficeSupplyManageAccess } from '@/capabilities/office_supply_request';

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

function OfficeSupplyAppShell({ children }: { children: ReactNode }) {
  const canManage = useOfficeSupplyManageAccess();
  return (
    <WorkAppShell
      title="사무용품 취합"
      items={[
        {
          to: '/workspace/office-supply',
          label: '내 신청',
          icon: <Package className="h-4 w-4" />,
          end: true,
        },
        {
          to: '/workspace/office-supply/manage',
          label: '취합·마감',
          icon: <ClipboardCheck className="h-4 w-4" />,
          visible: canManage,
        },
        {
          to: '/workspace/office-supply/catalog',
          label: '품목 목록',
          icon: <PackageOpen className="h-4 w-4" />,
          visible: canManage,
        },
      ]}
    >
      {children}
    </WorkAppShell>
  );
}

export const WorkspaceOfficeSupplyMyPage: React.FC = () => (
  <OfficeSupplyAppShell>
    <Suspense fallback={<LoadingScreen message="사무용품 신청 로딩…" />}>
      <OfficeSupplyMyView />
    </Suspense>
  </OfficeSupplyAppShell>
);

export const WorkspaceOfficeSupplyManagePage: React.FC = () => (
  <OfficeSupplyAppShell>
    <Suspense fallback={<LoadingScreen message="사무용품 취합 로딩…" />}>
      <OfficeSupplyManagePage />
    </Suspense>
  </OfficeSupplyAppShell>
);

export const WorkspaceOfficeSupplyCatalogPage: React.FC = () => (
  <OfficeSupplyAppShell>
    <Suspense fallback={<LoadingScreen message="구매 품목 로딩…" />}>
      <OfficeSupplyCatalogPage />
    </Suspense>
  </OfficeSupplyAppShell>
);
