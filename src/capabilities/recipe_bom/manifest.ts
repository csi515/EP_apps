import { defineCapability } from '../_shared/capabilityTypes';

export const recipe_bomCapability = defineCapability({
  id: 'recipe_bom',
  displayName: '레시피·BOM원가',
  dependencies: ['inventory'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
