import { defineCapability } from '../_shared/capabilityTypes';

export const hazardous_substance_msdsCapability = defineCapability({
  id: 'hazardous_substance_msds',
  displayName: '유해화학물질 및 시약 MSDS 관리',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
