import React, { Suspense, lazy } from 'react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const ShuttleRoutesPage = lazy(() =>
  import('@/capabilities/shuttle_dispatch').then((m) => ({ default: m.ShuttleRoutesPage })),
);
const ShuttleRosterPage = lazy(() =>
  import('@/capabilities/shuttle_dispatch').then((m) => ({ default: m.ShuttleRosterPage })),
);
const ShuttleRegisterView = lazy(() =>
  import('@/capabilities/shuttle_dispatch').then((m) => ({ default: m.ShuttleRegisterView })),
);

export const WorkspaceShuttleRoutesPage: React.FC = () => (
  <Suspense fallback={<LoadingScreen message="셔틀 노선 화면 로딩…" />}>
    <ShuttleRoutesPage />
  </Suspense>
);

export const WorkspaceShuttleRosterPage: React.FC = () => (
  <Suspense fallback={<LoadingScreen message="셔틀 명부 화면 로딩…" />}>
    <ShuttleRosterPage />
  </Suspense>
);

export const WorkspaceShuttleMyPage: React.FC = () => (
  <Suspense fallback={<LoadingScreen message="내 셔틀 설정 로딩…" />}>
    <ShuttleRegisterView />
  </Suspense>
);
