import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const mealSurveyResources: CapabilityResourceDefinition = {
  capabilityId: 'meal_survey',
  resources: [
    {
      name: 'meal_survey',
      list: '/workspace/meal-survey',
      meta: {
        label: '식수인원 조사',
        icon: 'UtensilsCrossed',
        order: 230,
      },
    },
    {
      name: 'meal_survey_manage',
      list: '/workspace/meal-survey/manage',
      meta: {
        label: '식수 전체 현황',
        icon: 'ClipboardList',
        order: 231,
        parent: 'meal_survey',
      },
    },
    {
      name: 'meal_survey_settings',
      list: '/workspace/meal-survey/settings',
      meta: {
        label: '식수 슬롯 설정',
        icon: 'Settings2',
        order: 232,
        parent: 'meal_survey',
      },
    },
  ],
};
