import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const trainingAckResources: CapabilityResourceDefinition = {
  capabilityId: 'training_ack',
  resources: [
    {
      name: 'training_ack',
      list: '/workspace/training',
      meta: {
        label: '교육관리',
        icon: 'GraduationCap',
        order: 240,
      },
    },
    {
      name: 'training_ack_manage',
      list: '/workspace/training/manage',
      meta: {
        label: '교육 관리',
        icon: 'ClipboardList',
        order: 241,
        parent: 'training_ack',
      },
    },
  ],
};
