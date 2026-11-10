import {
  getMemberFeatureTriState,
  companyAppAccessFeatureKey,
} from '@/pages/workspace/companyAppAccess';
import type { PublishedCompanyAppId } from '@/pages/workspace/publishedCompanyApps';

export type StaffAccessMemberPerms = {
  feature_permissions?: Record<string, boolean> | null;
  is_active?: boolean | null;
};

export type StaffAccessAppKpis = {
  granted: number;
  without: number;
  denied: number;
  activeTotal: number;
};

/** 앱별 배정 KPI (활성 멤버만) */
export function computeStaffAccessAppKpis(
  members: readonly StaffAccessMemberPerms[],
  appId: PublishedCompanyAppId
): StaffAccessAppKpis {
  const key = companyAppAccessFeatureKey(appId);
  const active = members.filter((m) => m.is_active !== false);
  let granted = 0;
  let denied = 0;
  let without = 0;
  for (const m of active) {
    const state = getMemberFeatureTriState(key, m.feature_permissions);
    if (state === 'granted') granted += 1;
    else if (state === 'denied') denied += 1;
    else without += 1;
  }
  return { granted, without, denied, activeTotal: active.length };
}
