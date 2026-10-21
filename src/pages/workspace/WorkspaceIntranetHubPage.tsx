import React from 'react';
import { CompanyAppLauncherDashboard } from './CompanyAppLauncherDashboard';

export const WorkspaceIntranetHubPage: React.FC<{
  enabledCapabilityIds?: readonly string[];
}> = () => {
  return (
    <main className="min-h-[100svh] bg-slate-50/60 pb-16">
      <CompanyAppLauncherDashboard />
    </main>
  );
};
