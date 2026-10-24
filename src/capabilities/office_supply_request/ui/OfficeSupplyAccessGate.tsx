import React from 'react';
import { useActiveUser } from '@/shared/session/useActiveUser';
import { normalizeRolePermissions } from '@/domain/permissions';
import { canManageOfficeSupplyRequest } from '../domain/officeSupplyRequestEngine';
import { AccessDeniedBanner } from '@/pages/settings/DynamicRoleSettingsPage';

export function useOfficeSupplyManageAccess(): boolean {
  const active = useActiveUser();
  const flags = normalizeRolePermissions(active?.customRole?.permissions ?? null);
  const permissions: Record<string, boolean> = { ...(flags ?? {}) };
  return canManageOfficeSupplyRequest({
    role: active?.role ?? null,
    permissions,
  });
}

export const OfficeSupplyManageGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const allowed = useOfficeSupplyManageAccess();
  if (!allowed) return <AccessDeniedBanner />;
  return <>{children}</>;
};
