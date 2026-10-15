import { defineCapability } from '../_shared/capabilityTypes';

export const sop_risk_assessmentCapability = defineCapability({
  id: 'sop_risk_assessment',
  displayName: '작업표준·위험성평가',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['safety:read', 'safety:write'],
});
