import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const facility_incident_reportResources: CapabilityResourceDefinition = {
  capabilityId: 'facility_incident_report',
  resources: [
    {
      name: 'facility_incident_reports',
      list: '/facility-incidents',
      create: '/facility-incidents/create',
      show: '/facility-incidents/:id',
      meta: {
        label: '안전사고 대장',
        order: 210,
      },
    },
  ],
};

export const facilityIncidentReportResources = facility_incident_reportResources;
