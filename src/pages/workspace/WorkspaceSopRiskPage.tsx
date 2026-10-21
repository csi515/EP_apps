import React, { Suspense, lazy } from 'react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const DesktopSopRiskMatrixView = lazy(() =>
  import('@/capabilities/sop_risk_assessment/components/DesktopSopRiskMatrixView').then((m) => ({
    default: m.DesktopSopRiskMatrixView,
  }))
);

/** 작업 표준(SOP) 및 위험성평가 와이드 데스크톱 통합 관리 워크스페이스 라우트 */
export const WorkspaceSopRiskPage: React.FC = () => {
  return (
    <main className="min-h-[100svh] bg-slate-50/60 pb-16">
      <Suspense fallback={<LoadingScreen message="작업 표준 및 위험성평가 와이드 매트릭스 로딩…" />}>
        <DesktopSopRiskMatrixView />
      </Suspense>
    </main>
  );
};
