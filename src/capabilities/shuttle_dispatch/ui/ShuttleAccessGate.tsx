import React from 'react';
import { useActiveUser } from '@/shared/session/useActiveUser';
import { normalizeRolePermissions } from '@/domain/permissions';
import { canManageShuttle } from '../domain/shuttleRosterEngine';
import { AccessDeniedBanner } from '@/pages/settings/DynamicRoleSettingsPage';

export function useShuttleManageAccess(): boolean {
  const active = useActiveUser();
  const flags = normalizeRolePermissions(active?.customRole?.permissions ?? null);
  const permissions: Record<string, boolean> = { ...(flags ?? {}) };
  return canManageShuttle({
    role: active?.role ?? null,
    permissions,
  });
}

export const ShuttleManageGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const allowed = useShuttleManageAccess();
  if (!allowed) return <AccessDeniedBanner />;
  return <>{children}</>;
};
