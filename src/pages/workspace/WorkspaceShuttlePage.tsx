import React, { Suspense, lazy, type ReactNode } from 'react';
import { Bus, MapPinned, Users } from 'lucide-react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { WorkAppShell } from '@/shared/components/layout/WorkAppShell';
import { useShuttleManageAccess } from '@/capabilities/shuttle_dispatch';

const ShuttleRoutesPage = lazy(() =>
  import('@/capabilities/shuttle_dispatch').then((m) => ({ default: m.ShuttleRoutesPage })),
);
const ShuttleRosterPage = lazy(() =>
  import('@/capabilities/shuttle_dispatch').then((m) => ({ default: m.ShuttleRosterPage })),
);
const ShuttleRegisterView = lazy(() =>
  import('@/capabilities/shuttle_dispatch').then((m) => ({ default: m.ShuttleRegisterView })),
);

function ShuttleAppShell({ children }: { children: ReactNode }) {
  const canManage = useShuttleManageAccess();
  return (
    <WorkAppShell
      title="통근 셔틀"
      items={[
        {
          to: '/workspace/shuttle/my',
          label: '내 탑승',
          icon: <Bus className="h-4 w-4" />,
          end: true,
        },
        {
          to: '/workspace/shuttle/roster',
          label: '탑승 명부',
          icon: <Users className="h-4 w-4" />,
          visible: canManage,
        },
        {
          to: '/workspace/shuttle/routes',
          label: '노선·정류장',
          icon: <MapPinned className="h-4 w-4" />,
          visible: canManage,
        },
      ]}
    >
      {children}
    </WorkAppShell>
  );
}

export const WorkspaceShuttleRoutesPage: React.FC = () => (
  <ShuttleAppShell>
    <Suspense fallback={<LoadingScreen message="셔틀 노선 화면 로딩…" />}>
      <ShuttleRoutesPage />
    </Suspense>
  </ShuttleAppShell>
);

export const WorkspaceShuttleRosterPage: React.FC = () => (
  <ShuttleAppShell>
    <Suspense fallback={<LoadingScreen message="셔틀 명부 화면 로딩…" />}>
      <ShuttleRosterPage />
    </Suspense>
  </ShuttleAppShell>
);

export const WorkspaceShuttleMyPage: React.FC = () => (
  <ShuttleAppShell>
    <Suspense fallback={<LoadingScreen message="내 셔틀 설정 로딩…" />}>
      <ShuttleRegisterView />
    </Suspense>
  </ShuttleAppShell>
);
