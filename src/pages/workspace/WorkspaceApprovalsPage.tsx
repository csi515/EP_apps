import React, { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const ApprovalWorkflowWithLinkedSync = lazy(() =>
  import('./ApprovalWorkflowWithLinkedSync').then((m) => ({
    default: m.ApprovalWorkflowWithLinkedSync,
  })),
);

/** 전자결재 — 사내 스위트 전용 워크스페이스 라우트 */
export const WorkspaceApprovalsPage: React.FC = () => {
  return (
    <main className="min-h-[100svh] bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold text-slate-900">전자 결재</h1>
          <Link
            to="/workspace/intranet"
            className="ml-auto min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            사내 업무 허브
          </Link>
        </div>
      </div>
      <Suspense fallback={<LoadingScreen message="결재 화면 로딩…" />}>
        <ApprovalWorkflowWithLinkedSync />
      </Suspense>
    </main>
  );
};
