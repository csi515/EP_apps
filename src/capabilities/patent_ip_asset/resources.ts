import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const patentIpAssetResources: CapabilityResourceDefinition = {
  capabilityId: 'patent_ip_asset',
  resources: [
    {
      name: 'patents',
      list: '/patents',
      show: '/patents/:id',
      create: '/patents/create',
      edit: '/patents/edit/:id',
      meta: {
        label: '특허·직무발명 관리',
        icon: 'Award',
        order: 195,
      },
    },
    {
      name: 'patent_inventors',
      list: '/patent-inventors',
      meta: {
        label: '발명자 및 지분율 대장',
        icon: 'Users',
        order: 196,
      },
    },
  ],
};
