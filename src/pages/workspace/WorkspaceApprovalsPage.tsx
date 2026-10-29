import React, { Suspense, lazy } from 'react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const ApprovalWorkflowWithLinkedSync = lazy(() =>
  import('./ApprovalWorkflowWithLinkedSync').then((m) => ({
    default: m.ApprovalWorkflowWithLinkedSync,
  })),
);

/** 전자결재 — Capability 루트가 WorkPageFrame 담당 */
export const WorkspaceApprovalsPage: React.FC = () => (
  <Suspense fallback={<LoadingScreen message="결재 화면 로딩…" />}>
    <ApprovalWorkflowWithLinkedSync />
  </Suspense>
);
