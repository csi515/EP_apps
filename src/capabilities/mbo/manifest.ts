import { defineCapability } from '../_shared/capabilityTypes';

export const mboCapability = defineCapability({
  id: 'mbo',
  displayName: '내 목표(MBO)',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['mbo:goals:write', 'mbo:goals:read', 'mbo:evaluations:approve', 'mbo:evaluations:read_all'],
});
