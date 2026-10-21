import { defineCapability } from '../_shared/capabilityTypes';

export const shuttle_dispatchCapability = defineCapability({
  id: 'shuttle_dispatch',
  displayName: '사내 통근 셔틀·고정 명부',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['shuttle:manage', 'shuttle:routes:manage'],
});
