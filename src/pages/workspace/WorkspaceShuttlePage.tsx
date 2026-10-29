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
  <div className="mx-auto max-w-5xl px-4 py-4">
    <Suspense fallback={<LoadingScreen message="셔틀 노선 화면 로딩…" />}>
      <ShuttleRoutesPage />
    </Suspense>
  </div>
);

export const WorkspaceShuttleRosterPage: React.FC = () => (
  <div className="mx-auto max-w-5xl px-4 py-4">
    <Suspense fallback={<LoadingScreen message="셔틀 명부 화면 로딩…" />}>
      <ShuttleRosterPage />
    </Suspense>
  </div>
);

export const WorkspaceShuttleMyPage: React.FC = () => (
  <div className="mx-auto max-w-5xl px-4 py-4">
    <Suspense fallback={<LoadingScreen message="내 셔틀 설정 로딩…" />}>
      <ShuttleRegisterView />
    </Suspense>
  </div>
);
