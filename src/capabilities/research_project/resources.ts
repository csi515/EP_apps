import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const researchProjectResources: CapabilityResourceDefinition = {
  capabilityId: 'research_project',
  resources: [
    {
      name: 'research_projects',
      list: '/research-projects',
      show: '/research-projects/:id',
      create: '/research-projects/create',
      edit: '/research-projects/edit/:id',
      meta: {
        label: '연구과제',
        icon: 'FolderKanban',
        order: 170,
      },
    },
    {
      name: 'research_project_gates',
      list: '/research-project-gates',
      meta: {
        label: '연구 게이트 승인',
        icon: 'GitBranch',
        order: 171,
      },
    },
    {
      name: 'research_project_deliverables',
      list: '/research-project-deliverables',
      meta: {
        label: '연구 산출물',
        icon: 'FileCheck',
        order: 172,
      },
    },
  ],
};
