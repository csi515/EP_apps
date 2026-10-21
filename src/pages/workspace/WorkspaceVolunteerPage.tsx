import React, { Suspense, lazy } from 'react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const VolunteerListView = lazy(() =>
  import('@/capabilities/volunteer_activity').then((m) => ({ default: m.VolunteerListView })),
);
const VolunteerManagePage = lazy(() =>
  import('@/capabilities/volunteer_activity').then((m) => ({ default: m.VolunteerManagePage })),
);

export const WorkspaceVolunteerListPage: React.FC = () => (
  <Suspense fallback={<LoadingScreen message="봉사활동 목록 로딩…" />}>
    <VolunteerListView />
  </Suspense>
);

export const WorkspaceVolunteerManagePage: React.FC = () => (
  <Suspense fallback={<LoadingScreen message="봉사활동 관리 로딩…" />}>
    <VolunteerManagePage />
  </Suspense>
);
