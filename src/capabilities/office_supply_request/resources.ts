import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const officeSupplyRequestResources: CapabilityResourceDefinition = {
  capabilityId: 'office_supply_request',
  resources: [
    {
      name: 'office_supply_request',
      list: '/workspace/office-supply',
      meta: {
        label: '사무용품 신청',
        icon: 'Package',
        order: 240,
      },
    },
    {
      name: 'office_supply_manage',
      list: '/workspace/office-supply/manage',
      meta: {
        label: '사무용품 취합',
        icon: 'ClipboardList',
        order: 241,
        parent: 'office_supply_request',
      },
    },
    {
      name: 'office_supply_catalog',
      list: '/workspace/office-supply/catalog',
      meta: {
        label: '구매 가능 품목',
        icon: 'ListChecks',
        order: 242,
        parent: 'office_supply_request',
      },
    },
  ],
};
