import React from 'react';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import { useMboManagementWorkspace } from '../hooks/useMboManagementWorkspace';
import { MboManagementMainContent } from './MboManagementMainContent';
import { MboManagementOverlayStack } from './MboManagementOverlayStack';

export const MboManagementView: React.FC = () => {
  const ws = useMboManagementWorkspace();

  return (
    <WorkPageFrame width="hub">
      <MboManagementMainContent ws={ws} />
      <MboManagementOverlayStack ws={ws} />
    </WorkPageFrame>
  );
};
