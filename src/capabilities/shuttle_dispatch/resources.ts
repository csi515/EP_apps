import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const shuttleDispatchResources: CapabilityResourceDefinition = {
  capabilityId: 'shuttle_dispatch',
  resources: [
    {
      name: 'shuttle_routes',
      list: '/workspace/shuttle/routes',
      meta: {
        label: '셔틀 노선·정류장',
        icon: 'Bus',
        order: 212,
      },
    },
    {
      name: 'shuttle_roster',
      list: '/workspace/shuttle/roster',
      meta: {
        label: '셔틀 고정 명부',
        icon: 'ClipboardList',
        order: 213,
        parent: 'shuttle_routes',
      },
    },
    {
      name: 'shuttle_my',
      list: '/workspace/shuttle/my',
      meta: {
        label: '내 셔틀 설정',
        icon: 'User',
        order: 214,
        parent: 'shuttle_routes',
      },
    },
  ],
};
