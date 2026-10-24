import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const hazardousSubstanceMsdsResources: CapabilityResourceDefinition = {
  capabilityId: 'hazardous_substance_msds',
  resources: [
    {
      name: 'hazardous_substances',
      list: '/hazardous-substances',
      show: '/hazardous-substances/:id',
      create: '/hazardous-substances/create',
      edit: '/hazardous-substances/edit/:id',
      meta: {
        label: '화학시약 및 MSDS 대장',
        icon: 'FlaskConical',
        order: 197,
      },
    },
    {
      name: 'chemical_usage_logs',
      list: '/chemical-usage-logs',
      meta: {
        label: '시약 수불 및 폐액 관리',
        icon: 'ClipboardList',
        order: 198,
      },
    },
  ],
};
