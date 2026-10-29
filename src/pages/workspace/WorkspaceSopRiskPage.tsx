import React, { Suspense, lazy } from 'react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const DesktopSopRiskMatrixView = lazy(() =>
  import('@/capabilities/sop_risk_assessment/components/DesktopSopRiskMatrixView').then((m) => ({
    default: m.DesktopSopRiskMatrixView,
  }))
);

/** 작업 표준(SOP) 및 위험성평가 — Capability 루트가 WorkPageFrame 담당 */
export const WorkspaceSopRiskPage: React.FC = () => (
  <Suspense fallback={<LoadingScreen message="작업 표준 및 위험성평가 와이드 매트릭스 로딩…" />}>
    <DesktopSopRiskMatrixView />
  </Suspense>
);
