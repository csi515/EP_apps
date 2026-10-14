import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const recipeBomResources: CapabilityResourceDefinition = {
  capabilityId: 'recipe_bom',
  resources: [
    {
      name: 'recipe_bom',
      list: '/recipe-bom',
      create: '/recipe-bom/new',
      show: '/recipe-bom/:id',
      edit: '/recipe-bom/:id/edit',
      meta: {
        label: '레시피·BOM원가',
        icon: 'UtensilsCrossed',
        order: 240,
      },
    },
  ],
};
