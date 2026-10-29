import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const mboResources: CapabilityResourceDefinition = {
  capabilityId: 'mbo',
  resources: [
    {
      name: 'mbo_objectives',
      list: '/workspace/mbo',
      meta: {
        label: '목표관리(MBO)',
        icon: 'Target',
        order: 190,
      },
    },
    {
      name: 'mbo_projects',
      list: '/workspace/mbo',
      meta: {
        label: 'MBO 실행 프로젝트',
        icon: 'FolderKanban',
        order: 191,
      },
    },
    {
      name: 'mbo_evaluations',
      list: '/workspace/mbo',
      meta: {
        label: 'MBO 성과 평가',
        icon: 'Award',
        order: 192,
      },
    },
    {
      name: 'mbo_progress_logs',
      list: '/workspace/mbo',
      meta: {
        label: 'MBO 월별 체크인',
        icon: 'Activity',
        order: 193,
      },
    },
  ],
};
