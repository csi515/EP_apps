import React, { Suspense, lazy, type ReactNode } from 'react';
import { ClipboardList, Settings2, UtensilsCrossed } from 'lucide-react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { WorkAppShell } from '@/shared/components/layout/WorkAppShell';
import { useMealSurveyManageAccess } from '@/capabilities/meal_survey';

const MealSurveyMyView = lazy(() =>
  import('@/capabilities/meal_survey').then((m) => ({ default: m.MealSurveyMyView })),
);
const MealSurveyManagePage = lazy(() =>
  import('@/capabilities/meal_survey').then((m) => ({ default: m.MealSurveyManagePage })),
);
const MealSurveySettingsPage = lazy(() =>
  import('@/capabilities/meal_survey').then((m) => ({ default: m.MealSurveySettingsPage })),
);

function MealSurveyAppShell({ children }: { children: ReactNode }) {
  const canManage = useMealSurveyManageAccess();
  return (
    <WorkAppShell
      title="식수인원 조사"
      items={[
        {
          to: '/workspace/meal-survey',
          label: '내 식수',
          icon: <UtensilsCrossed className="h-4 w-4" />,
          end: true,
        },
        {
          to: '/workspace/meal-survey/manage',
          label: '조리팀 현황',
          icon: <ClipboardList className="h-4 w-4" />,
          visible: canManage,
        },
        {
          to: '/workspace/meal-survey/settings',
          label: '운영·마감',
          icon: <Settings2 className="h-4 w-4" />,
          visible: canManage,
        },
      ]}
    >
      {children}
    </WorkAppShell>
  );
}

export const WorkspaceMealSurveyMyPage: React.FC = () => (
  <MealSurveyAppShell>
    <Suspense fallback={<LoadingScreen message="식수 조사 로딩…" />}>
      <MealSurveyMyView />
    </Suspense>
  </MealSurveyAppShell>
);

export const WorkspaceMealSurveyManagePage: React.FC = () => (
  <MealSurveyAppShell>
    <Suspense fallback={<LoadingScreen message="식수 현황 로딩…" />}>
      <MealSurveyManagePage />
    </Suspense>
  </MealSurveyAppShell>
);

export const WorkspaceMealSurveySettingsPage: React.FC = () => (
  <MealSurveyAppShell>
    <Suspense fallback={<LoadingScreen message="식수 설정 로딩…" />}>
      <MealSurveySettingsPage />
    </Suspense>
  </MealSurveyAppShell>
);
