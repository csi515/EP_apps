import { defineCapability } from '../_shared/capabilityTypes';

export const facility_incident_reportCapability = defineCapability({
  id: 'facility_incident_report',
  displayName: '시설 안전사고·파손 경위서 & 보험 대장',
  dependencies: ['safety_consent'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['safety.manage'],
});

export const facilityIncidentReportCapability = facility_incident_reportCapability;
