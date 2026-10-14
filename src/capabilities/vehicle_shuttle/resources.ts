import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const vehicleShuttleResources: CapabilityResourceDefinition = {
  capabilityId: 'vehicle_shuttle',
  resources: [
    {
      name: 'shuttle_routes',
      list: '/shuttle',
      create: '/shuttle/new',
      show: '/shuttle/:id',
      edit: '/shuttle/:id/edit',
      meta: {
        label: '안심 통학·셔틀 관제',
        icon: 'Bus',
        order: 210,
      },
    },
  ],
};
