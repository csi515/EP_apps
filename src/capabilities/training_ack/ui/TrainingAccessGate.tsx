import React from 'react';
import { useActiveUser } from '@/shared/session/useActiveUser';
import { AccessDeniedBanner } from '@/pages/settings/DynamicRoleSettingsPage';
import { canManageTrainingAck } from '@/domain/permissions';

export function useTrainingManageAccess(): boolean {
  const active = useActiveUser();
  return canManageTrainingAck({
    role: active?.role ?? null,
    permissions: active?.customRole?.permissions ?? null,
    customRole: active?.customRole ?? null,
  });
}

export const TrainingManageGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const allowed = useTrainingManageAccess();
  if (!allowed) return <AccessDeniedBanner />;
  return <>{children}</>;
};
