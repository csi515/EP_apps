import { defineCapability } from '../_shared/capabilityTypes';

export const meal_surveyCapability = defineCapability({
  id: 'meal_survey',
  displayName: '식수인원 조사',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['meal_survey:manage'],
});
