import { defineCapability } from '../_shared/capabilityTypes';

export const equipment_lifecycleCapability = defineCapability({
  id: 'equipment_lifecycle',
  displayName: '장비수명·유지보수',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['equipment:read', 'equipment:write'],
});
