import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const mboResources: CapabilityResourceDefinition = {
  capabilityId: 'mbo',
  resources: [
    {
      name: 'mbo_objectives',
      list: '/operations/mbo',
      meta: {
        label: '목표관리(MBO)',
        icon: 'Target',
        order: 190,
      },
    },
    {
      name: 'mbo_projects',
      list: '/operations/mbo/projects',
      meta: {
        label: 'MBO 실행 프로젝트',
        icon: 'FolderKanban',
        order: 191,
      },
    },
    {
      name: 'mbo_evaluations',
      list: '/operations/mbo/evaluations',
      meta: {
        label: 'MBO 성과 평가',
        icon: 'Award',
        order: 192,
      },
    },
  ],
};
