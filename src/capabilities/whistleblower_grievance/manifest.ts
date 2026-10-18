import { defineCapability } from '../_shared/capabilityTypes';

export const whistleblower_grievanceCapability = defineCapability({
  id: 'whistleblower_grievance',
  displayName: '사내 익명 고충 상담 및 윤리 제보함',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
