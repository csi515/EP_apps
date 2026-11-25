import React from 'react';
import { useActiveUser } from '@/shared/session/useActiveUser';
import { AccessDeniedBanner } from '@/pages/settings/DynamicRoleSettingsPage';
import { canManageSupplyRestock } from '@/domain/permissions';

export function useSupplyRestockManageAccess(): boolean {
  const active = useActiveUser();
  return canManageSupplyRestock({
    role: active?.role ?? null,
    permissions: active?.customRole?.permissions ?? null,
    customRole: active?.customRole ?? null,
  });
}

/** 안전재고 등록·발주 등 쓰기 화면 — 담당자만 */
export const SupplyRestockManageGate: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const allowed = useSupplyRestockManageAccess();
  if (!allowed) return <AccessDeniedBanner />;
  return <>{children}</>;
};
