import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const volunteerActivityResources: CapabilityResourceDefinition = {
  capabilityId: 'volunteer_activity',
  resources: [
    {
      name: 'volunteer_activities',
      list: '/workspace/volunteer',
      meta: {
        label: '봉사활동',
        icon: 'HeartHandshake',
        order: 220,
      },
    },
    {
      name: 'volunteer_manage',
      list: '/workspace/volunteer/manage',
      meta: {
        label: '봉사활동 게시·관리',
        icon: 'ClipboardPlus',
        order: 221,
        parent: 'volunteer_activities',
      },
    },
  ],
};
