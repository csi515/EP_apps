import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const sopRiskAssessmentResources: CapabilityResourceDefinition = {
  capabilityId: 'sop_risk_assessment',
  resources: [
    {
      name: 'risk_assessments',
      list: '/sop-risk',
      create: '/sop-risk',
      show: '/sop-risk',
      edit: '/sop-risk',
      meta: {
        label: '작업표준·위험성평가',
        icon: 'ShieldAlert',
        order: 370,
      },
    },
    {
      name: 'risk_assessment_approvals',
      list: '/workspace/approvals',
      meta: {
        label: '내 결재 대기함',
        icon: 'FileCheck',
        order: 372,
      },
    },
  ],
};
