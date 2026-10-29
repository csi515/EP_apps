import React, { Suspense, lazy } from 'react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const MboManagementView = lazy(() =>
  import('@/capabilities/mbo').then((m) => ({ default: m.MboManagementView })),
);

/** MBO 정기 점검·수정 추적 전용 워크스페이스 라우트 */
export const WorkspaceMboPage: React.FC = () => (
  <Suspense fallback={<LoadingScreen message="MBO 화면 로딩…" />}>
    <MboManagementView />
  </Suspense>
);
