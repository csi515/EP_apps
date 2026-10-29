import React, { Suspense, lazy, type ReactNode } from 'react';
import { HeartHandshake, Settings2 } from 'lucide-react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { WorkAppShell } from '@/shared/components/layout/WorkAppShell';
import { useVolunteerManageAccess } from '@/capabilities/volunteer_activity';

const VolunteerListView = lazy(() =>
  import('@/capabilities/volunteer_activity').then((m) => ({ default: m.VolunteerListView })),
);
const VolunteerManagePage = lazy(() =>
  import('@/capabilities/volunteer_activity').then((m) => ({ default: m.VolunteerManagePage })),
);

function VolunteerAppShell({ children }: { children: ReactNode }) {
  const canManage = useVolunteerManageAccess();
  return (
    <WorkAppShell
      title="봉사활동"
      items={[
        {
          to: '/workspace/volunteer',
          label: '참여 목록',
          icon: <HeartHandshake className="h-4 w-4" />,
          end: true,
        },
        {
          to: '/workspace/volunteer/manage',
          label: '게시·관리',
          icon: <Settings2 className="h-4 w-4" />,
          visible: canManage,
        },
      ]}
    >
      {children}
    </WorkAppShell>
  );
}

export const WorkspaceVolunteerListPage: React.FC = () => (
  <VolunteerAppShell>
    <Suspense fallback={<LoadingScreen message="봉사활동 목록 로딩…" />}>
      <VolunteerListView />
    </Suspense>
  </VolunteerAppShell>
);

export const WorkspaceVolunteerManagePage: React.FC = () => (
  <VolunteerAppShell>
    <Suspense fallback={<LoadingScreen message="봉사활동 관리 로딩…" />}>
      <VolunteerManagePage />
    </Suspense>
  </VolunteerAppShell>
);
