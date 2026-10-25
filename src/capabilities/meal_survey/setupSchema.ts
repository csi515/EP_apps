import type { CapabilitySetupSchema } from '@/core/presets/types';

export const mealSurveySetupSchema: CapabilitySetupSchema = {
  capabilityId: 'meal_survey',
  title: '식수인원 조사',
  description: '조·중·석 제공 설정 및 임직원 일별 식사 여부 사전 조사',
  fields: [
    {
      id: 'surveyDeadlineHour',
      label: '당일 식수 조사 마감 시각 (시)',
      type: 'number',
      defaultValue: 10,
    },
    {
      id: 'enabledMealTypes',
      label: '제공 식사 구분',
      type: 'tags',
      defaultValue: ['중식', '석식'],
    },
  ],
};
