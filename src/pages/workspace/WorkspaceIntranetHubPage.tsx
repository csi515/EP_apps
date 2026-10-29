import React from 'react';
import { CompanyAppLauncherDashboard } from './CompanyAppLauncherDashboard';

/** 사내 업무 허브 — 앱 목록만 (홈 런처의 브리핑·결재 배지와 역할 분리) */
export const WorkspaceIntranetHubPage: React.FC<{
  enabledCapabilityIds?: readonly string[];
}> = ({ enabledCapabilityIds }) => (
  <CompanyAppLauncherDashboard
    variant="hub"
    enabledCapabilityIds={enabledCapabilityIds}
  />
);
