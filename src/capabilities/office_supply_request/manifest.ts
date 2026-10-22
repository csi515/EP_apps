import { defineCapability } from '../_shared/capabilityTypes';

export const office_supply_requestCapability = defineCapability({
  id: 'office_supply_request',
  displayName: '사무용품 월별 취합',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['office_supply_request:manage'],
});
