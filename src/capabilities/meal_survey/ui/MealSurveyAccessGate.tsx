import React from 'react';
import { StorageService } from '@/services/storage';
import { normalizeRolePermissions } from '@/domain/permissions';
import { canManageMealSurveyActivity } from '../domain/mealSurveyEngine';
import { AccessDeniedBanner } from '@/pages/settings/DynamicRoleSettingsPage';

export function useMealSurveyManageAccess(): boolean {
  const active = StorageService.getActiveUser();
  const flags = normalizeRolePermissions(active?.customRole?.permissions ?? null);
  const permissions: Record<string, boolean> = { ...(flags ?? {}) };
  return canManageMealSurveyActivity({
    role: active?.role ?? null,
    permissions,
  });
}

export const MealSurveyManageGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const allowed = useMealSurveyManageAccess();
  if (!allowed) return <AccessDeniedBanner />;
  return <>{children}</>;
};
