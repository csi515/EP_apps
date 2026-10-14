import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const equipmentLifecycleResources: CapabilityResourceDefinition = {
  capabilityId: 'equipment_lifecycle',
  resources: [
    {
      name: 'equipment_lifecycle',
      list: '/equipment-lifecycle',
      create: '/equipment-lifecycle/new',
      show: '/equipment-lifecycle/:id',
      edit: '/equipment-lifecycle/:id/edit',
      meta: {
        label: '장비수명·유지보수',
        icon: 'Wrench',
        order: 310,
      },
    },
  ],
};
