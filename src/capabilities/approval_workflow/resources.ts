import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const approvalWorkflowResources: CapabilityResourceDefinition = {
  capabilityId: 'approval_workflow',
  resources: [
    {
      name: 'approval_requests',
      list: '/operations/approvals',
      meta: {
        label: '전자결재함',
        icon: 'FileCheck',
        order: 195,
      },
    },
    {
      name: 'approval_templates',
      list: '/operations/approvals/templates',
      meta: {
        label: '결재 양식 관리',
        icon: 'FileText',
        order: 196,
      },
    },
  ],
};
