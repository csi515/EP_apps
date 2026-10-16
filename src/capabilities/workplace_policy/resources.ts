import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const workplacePolicyResources: CapabilityResourceDefinition = {
  capabilityId: 'workplace_policy',
  resources: [
    {
      name: 'workplace_policies',
      list: '/settings/policies',
      create: '/settings/policies/create',
      edit: '/settings/policies/:id/edit',
      show: '/settings/policies/:id',
      meta: {
        label: '매장 사규·내규',
        icon: 'BookOpen',
        order: 175,
      },
    },
  ],
};
