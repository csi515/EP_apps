import { defineCapability } from '../_shared/capabilityTypes';

export const volunteer_activityCapability = defineCapability({
  id: 'volunteer_activity',
  displayName: '사내 봉사활동 모집',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['volunteer:manage'],
});
