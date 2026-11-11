import React, { Suspense, lazy } from 'react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';

const FacilityIncidentReportView = lazy(() =>
  import('@/capabilities/facility_incident_report').then((m) => ({
    default: m.FacilityIncidentReportView,
  }))
);

/** 시설 안전사고·파손 경위 대장 */
export const WorkspaceFacilityIncidentPage: React.FC = () => (
  <Suspense fallback={<LoadingScreen message="시설 사고 경위 대장 로딩…" />}>
    <FacilityIncidentReportView />
  </Suspense>
);
