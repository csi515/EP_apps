import React from 'react';
import { useActiveUser } from '@/shared/session/useActiveUser';
import { normalizeRolePermissions } from '@/domain/permissions';
import { canManageVolunteerActivity } from '../domain/volunteerActivityEngine';
import { AccessDeniedBanner } from '@/pages/settings/DynamicRoleSettingsPage';

export function useVolunteerManageAccess(): boolean {
  const active = useActiveUser();
  const flags = normalizeRolePermissions(active?.customRole?.permissions ?? null);
  const permissions: Record<string, boolean> = { ...(flags ?? {}) };
  return canManageVolunteerActivity({
    role: active?.role ?? null,
    permissions,
  });
}

export const VolunteerManageGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const allowed = useVolunteerManageAccess();
  if (!allowed) return <AccessDeniedBanner />;
  return <>{children}</>;
};
