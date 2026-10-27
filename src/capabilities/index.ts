// @ts-nocheck
/**
 * EP_apps Capability 공개 배럴 — 디스크에 존재하는 manifest만 등록한다.
 */
import type { CapabilityManifest } from './_shared/capabilityTypes';
import { bookingCapability } from './booking/manifest';
import { commerceCapability } from './commerce/manifest';
import { resourcesCapability } from './resources/manifest';
import { schedulingCapability } from './scheduling/manifest';
import { inventoryCapability } from './inventory/manifest';
import { seat_roomCapability } from './seat_room/manifest';
import { rental_equipmentCapability } from './rental_equipment/manifest';
import { maintenance_checklistCapability } from './maintenance_checklist/manifest';
import { task_pipelineCapability } from './task_pipeline/manifest';
import { safety_consentCapability } from './safety_consent/manifest';
import { shuttle_dispatchCapability } from './shuttle_dispatch/manifest';
import { volunteer_activityCapability } from './volunteer_activity/manifest';
import { meal_surveyCapability } from './meal_survey/manifest';
import { office_supply_requestCapability } from './office_supply_request/manifest';
import { recipe_bomCapability } from './recipe_bom/manifest';
import { equipment_lifecycleCapability } from './equipment_lifecycle/manifest';
import { sop_risk_assessmentCapability } from './sop_risk_assessment/manifest';
import { supply_restockCapability } from './supply_restock/manifest';
import { facilityIncidentReportCapability } from './facility_incident_report/manifest';
import { mboCapability } from './mbo/manifest';
import { approval_workflowCapability } from './approval_workflow/manifest';
import { patent_ip_assetCapability } from './patent_ip_asset/manifest';
import { research_projectCapability } from './research_project/manifest';
import { whistleblower_grievanceCapability } from './whistleblower_grievance/manifest';
import { hazardous_substance_msdsCapability } from './hazardous_substance_msds/manifest';

export {
  CAPABILITY_IDS,
  CAPABILITY_DOMAIN_RELATIONS,
  assertCapabilityDefinition,
  defineCapability,
  type CapabilityDefinition,
  type CapabilityId,
  type CapabilityManifest,
} from './_shared/capabilityTypes';

export const CAPABILITY_MANIFESTS: readonly CapabilityManifest[] = [
  schedulingCapability,
  bookingCapability,
  commerceCapability,
  resourcesCapability,
  inventoryCapability,
  seat_roomCapability,
  rental_equipmentCapability,
  maintenance_checklistCapability,
  task_pipelineCapability,
  safety_consentCapability,
  shuttle_dispatchCapability,
  volunteer_activityCapability,
  meal_surveyCapability,
  office_supply_requestCapability,
  recipe_bomCapability,
  equipment_lifecycleCapability,
  sop_risk_assessmentCapability,
  supply_restockCapability,
  facilityIncidentReportCapability,
  mboCapability,
  approval_workflowCapability,
  patent_ip_assetCapability,
  research_projectCapability,
  whistleblower_grievanceCapability,
  hazardous_substance_msdsCapability,
];

export * from './supply_restock';
export * from './facility_incident_report';
export * from './mbo';
export * from './approval_workflow';
export * from './patent_ip_asset';
export * from './research_project';
export * from './whistleblower_grievance';
export * from './hazardous_substance_msds';

const CAPABILITY_DISPLAY_NAME_MAP: Record<string, string> = Object.fromEntries(
  CAPABILITY_MANIFESTS.map((m) => [m.definition.id, m.definition.displayName])
);

/** Capability ID에 대응하는 표준 한글 명칭(displayName) */
export function getCapabilityDisplayName(id: string): string {
  return CAPABILITY_DISPLAY_NAME_MAP[id] || id;
}
