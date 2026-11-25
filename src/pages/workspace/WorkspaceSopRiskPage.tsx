import React, { Suspense, lazy } from 'react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { SOP_RISK_UI_COPY } from '@/capabilities/sop_risk_assessment/ui/sopRiskUiCopy';

const DesktopSopRiskMatrixView = lazy(() =>
  import('@/capabilities/sop_risk_assessment/components/DesktopSopRiskMatrixView').then((m) => ({
    default: m.DesktopSopRiskMatrixView,
  }))
);

/** 작업 표준(SOP) 및 위험성평가 — Capability 루트가 WorkPageFrame 담당 */
export const WorkspaceSopRiskPage: React.FC = () => (
  <Suspense fallback={<LoadingScreen message={SOP_RISK_UI_COPY.pageLoading} />}>
    <DesktopSopRiskMatrixView />
  </Suspense>
);
