import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const whistleblowerGrievanceResources: CapabilityResourceDefinition = {
  capabilityId: 'whistleblower_grievance',
  resources: [
    {
      name: 'anonymous_grievances',
      list: '/whistleblower-grievances',
      meta: {
        label: '익명 고충 제보함',
        icon: 'HelpCircle',
        order: 148,
      },
    },
  ],
};
