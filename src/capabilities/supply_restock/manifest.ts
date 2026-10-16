import { defineCapability } from '../_shared/capabilityTypes';

export const supply_restockCapability = defineCapability({
  id: 'supply_restock',
  displayName: '소모품 안전재고 및 간이 발주서',
  dependencies: ['inventory'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
