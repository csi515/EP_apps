import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const supply_restockResources: CapabilityResourceDefinition = {
  capabilityId: 'supply_restock',
  resources: [
    {
      name: 'supply_restock_items',
      list: '/supply-restock',
      show: '/supply-restock/:id',
      create: '/supply-restock/create',
      edit: '/supply-restock/edit/:id',
      meta: {
        label: '소모품 안전재고·발주',
        icon: 'ShoppingCart',
        order: 187,
      },
    },
  ],
};
