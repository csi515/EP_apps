import React, { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const DesktopSopRiskMatrixView = lazy(() =>
  import('@/capabilities/sop_risk_assessment/components/DesktopSopRiskMatrixView').then((m) => ({
    default: m.DesktopSopRiskMatrixView,
  }))
);

/** 작업 표준(SOP) 및 위험성평가 — Capability 루트가 WorkPageFrame 담당 */
export const WorkspaceSopRiskPage: React.FC = () => (
  <Suspense fallback={<LoadingScreen message="작업 표준 및 위험성평가 와이드 매트릭스 로딩…" />}>
    <div className="space-y-3">
      <div className="flex justify-end px-1 print:hidden">
        <Link
          to="/workspace/facility-incidents"
          className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          시설 사고 경위 대장
        </Link>
      </div>
      <DesktopSopRiskMatrixView />
    </div>
  </Suspense>
);
