import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const sopRiskAssessmentResources: CapabilityResourceDefinition = {
  capabilityId: 'sop_risk_assessment',
  resources: [
    {
      name: 'sop_risk_assessment',
      list: '/sop-risk',
      create: '/sop-risk/new',
      show: '/sop-risk/:id',
      edit: '/sop-risk/:id/edit',
      meta: {
        label: '작업표준·위험성평가',
        icon: 'ShieldAlert',
        order: 370,
      },
    },
  ],
};
