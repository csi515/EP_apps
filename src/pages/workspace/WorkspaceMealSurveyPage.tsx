import React, { Suspense, lazy } from 'react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const MealSurveyMyView = lazy(() =>
  import('@/capabilities/meal_survey').then((m) => ({ default: m.MealSurveyMyView })),
);
const MealSurveyManagePage = lazy(() =>
  import('@/capabilities/meal_survey').then((m) => ({ default: m.MealSurveyManagePage })),
);
const MealSurveySettingsPage = lazy(() =>
  import('@/capabilities/meal_survey').then((m) => ({ default: m.MealSurveySettingsPage })),
);

export const WorkspaceMealSurveyMyPage: React.FC = () => (
  <Suspense fallback={<LoadingScreen message="식수 조사 로딩…" />}>
    <MealSurveyMyView />
  </Suspense>
);

export const WorkspaceMealSurveyManagePage: React.FC = () => (
  <Suspense fallback={<LoadingScreen message="식수 현황 로딩…" />}>
    <MealSurveyManagePage />
  </Suspense>
);

export const WorkspaceMealSurveySettingsPage: React.FC = () => (
  <Suspense fallback={<LoadingScreen message="식수 설정 로딩…" />}>
    <MealSurveySettingsPage />
  </Suspense>
);
