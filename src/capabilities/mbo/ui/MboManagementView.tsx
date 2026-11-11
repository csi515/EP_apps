import React from 'react';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import { useMboManagementWorkspace } from '../hooks/useMboManagementWorkspace';
import { MboManagementMainContent } from './MboManagementMainContent';
import { MboManagementOverlayStack } from './MboManagementOverlayStack';

export const MboManagementView: React.FC = () => {
  const ws = useMboManagementWorkspace();
  const progressActive = Boolean(
    ws.objQuery?.isFetching || ws.projectQuery?.isFetching || ws.logQuery?.isFetching,
  );

  return (
    <WorkPageFrame width="hub" progressActive={progressActive}>
      <MboManagementMainContent ws={ws} />
      <MboManagementOverlayStack ws={ws} />
    </WorkPageFrame>
  );
};
