import React, { Suspense, lazy, type ReactNode } from 'react';
import { HelpCircle, Settings2 } from 'lucide-react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { WorkAppShell } from '@/shared/components/layout/WorkAppShell';
import { useCanManageGrievances } from '@/capabilities/whistleblower_grievance/components/GrievanceListPage';

const GrievanceListPage = lazy(() =>
  import('@/capabilities/whistleblower_grievance').then((m) => ({ default: m.GrievanceListPage })),
);

function GrievanceAppShell({ children }: { children: ReactNode }) {
  const canManage = useCanManageGrievances();
  return (
    <WorkAppShell
      title="노경 건의함"
      items={[
        {
          to: '/workspace/grievances',
          label: '내 건의',
          icon: <HelpCircle className="h-4 w-4" />,
          end: true,
        },
        {
          to: '/workspace/grievances/manage',
          label: '접수·회신',
          icon: <Settings2 className="h-4 w-4" />,
          visible: canManage,
        },
      ]}
    >
      {children}
    </WorkAppShell>
  );
}

/** 사내 건의함 — 내 건의 */
export const WorkspaceFeedbacksPage: React.FC = () => (
  <GrievanceAppShell>
    <Suspense fallback={<LoadingScreen message="건의함 로딩…" />}>
      <GrievanceListPage mode="mine" />
    </Suspense>
  </GrievanceAppShell>
);

/** 사내 건의함 — 담당 접수함 */
export const WorkspaceGrievancesManagePage: React.FC = () => (
  <GrievanceAppShell>
    <Suspense fallback={<LoadingScreen message="건의 접수함 로딩…" />}>
      <GrievanceListPage mode="manage" />
    </Suspense>
  </GrievanceAppShell>
);
