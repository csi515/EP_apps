import { defineCapability } from '../_shared/capabilityTypes';

export const mboCapability = defineCapability({
  id: 'mbo',
  displayName: '목표관리(MBO) 및 실행 프로젝트',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['mbo:view', 'mbo:write', 'mbo:evaluate', 'mbo:approve'],
});
