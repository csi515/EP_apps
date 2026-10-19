import { defineCapability } from '../_shared/capabilityTypes';

export const mboCapability = defineCapability({
  id: 'mbo',
  displayName: '목표관리(MBO) 및 실행 프로젝트',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['mbo:goals:write', 'mbo:goals:read', 'mbo:evaluations:approve', 'mbo:evaluations:read_all'],
});
