import React, { Suspense, lazy, type ReactNode } from 'react';
import { ClipboardList, GraduationCap } from 'lucide-react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { WorkAppShell } from '@/shared/components/layout/WorkAppShell';
import { useTrainingManageAccess } from '@/capabilities/training_ack';

const TrainingMyView = lazy(() =>
  import('@/capabilities/training_ack').then((m) => ({ default: m.TrainingMyView })),
);
const TrainingManagePage = lazy(() =>
  import('@/capabilities/training_ack').then((m) => ({ default: m.TrainingManagePage })),
);

function TrainingAppShell({ children }: { children: ReactNode }) {
  const canManage = useTrainingManageAccess();
  return (
    <WorkAppShell
      title="교육관리"
      items={[
        {
          to: '/workspace/training',
          label: '내 교육',
          icon: <GraduationCap className="h-4 w-4" />,
          end: true,
        },
        {
          to: '/workspace/training/manage',
          label: '교육 관리',
          icon: <ClipboardList className="h-4 w-4" />,
          visible: canManage,
        },
      ]}
    >
      {children}
    </WorkAppShell>
  );
}

export const WorkspaceTrainingMyPage: React.FC = () => (
  <TrainingAppShell>
    <Suspense fallback={<LoadingScreen message="교육관리 로딩…" />}>
      <TrainingMyView />
    </Suspense>
  </TrainingAppShell>
);

export const WorkspaceTrainingManagePage: React.FC = () => (
  <TrainingAppShell>
    <Suspense fallback={<LoadingScreen message="교육 관리 로딩…" />}>
      <TrainingManagePage />
    </Suspense>
  </TrainingAppShell>
);
