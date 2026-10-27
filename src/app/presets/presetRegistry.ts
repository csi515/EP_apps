// @ts-nocheck
/**
 * EP_apps Industry Preset Registry
 * personal_plant_ops 단일 프리셋 + 해당 Capability 번들만 등록한다.
 */

import type {
  BundledPresetCapabilityId,
  CapabilityModuleBundle,
  IndustryPresetDefinition,
} from '@/core/presets/types';
import { registerCapabilityBundles } from '@/core/presets/presetAssembler';

import { bookingSetupSchema } from '@/capabilities/booking/setupSchema';
import { bookingResources } from '@/capabilities/booking/resources';
import { inventorySetupSchema } from '@/capabilities/inventory/setupSchema';
import { inventoryResources } from '@/capabilities/inventory/resources';
import { seatRoomSetupSchema } from '@/capabilities/seat_room/setupSchema';
import { seatRoomResources } from '@/capabilities/seat_room/resources';
import { rentalEquipmentSetupSchema } from '@/capabilities/rental_equipment/setupSchema';
import { rentalEquipmentResources } from '@/capabilities/rental_equipment/resources';
import { maintenanceChecklistSetupSchema } from '@/capabilities/maintenance_checklist/setupSchema';
import { maintenanceChecklistResources } from '@/capabilities/maintenance_checklist/resources';
import { taskPipelineSetupSchema } from '@/capabilities/task_pipeline/setupSchema';
import { taskPipelineResources } from '@/capabilities/task_pipeline/resources';
import { safetyConsentSetupSchema } from '@/capabilities/safety_consent/setupSchema';
import { safetyConsentResources } from '@/capabilities/safety_consent/resources';
import { shuttleDispatchSetupSchema } from '@/capabilities/shuttle_dispatch/setupSchema';
import { shuttleDispatchResources } from '@/capabilities/shuttle_dispatch/resources';
import { volunteerActivitySetupSchema } from '@/capabilities/volunteer_activity/setupSchema';
import { volunteerActivityResources } from '@/capabilities/volunteer_activity/resources';
import { mealSurveySetupSchema } from '@/capabilities/meal_survey/setupSchema';
import { mealSurveyResources } from '@/capabilities/meal_survey/resources';
import { officeSupplyRequestSetupSchema } from '@/capabilities/office_supply_request/setupSchema';
import { officeSupplyRequestResources } from '@/capabilities/office_supply_request/resources';
import { recipeBomSetupSchema } from '@/capabilities/recipe_bom/setupSchema';
import { recipeBomResources } from '@/capabilities/recipe_bom/resources';
import { equipmentLifecycleSetupSchema } from '@/capabilities/equipment_lifecycle/setupSchema';
import { equipmentLifecycleResources } from '@/capabilities/equipment_lifecycle/resources';
import { sopRiskAssessmentSetupSchema } from '@/capabilities/sop_risk_assessment/setupSchema';
import { sopRiskAssessmentResources } from '@/capabilities/sop_risk_assessment/resources';
import { supply_restockSetupSchema } from '@/capabilities/supply_restock/setupSchema';
import { supply_restockResources } from '@/capabilities/supply_restock/resources';
import { facilityIncidentReportSetupSchema } from '@/capabilities/facility_incident_report/setupSchema';
import { facilityIncidentReportResources } from '@/capabilities/facility_incident_report/resources';
import { mboSetupSchema } from '@/capabilities/mbo/setupSchema';
import { mboResources } from '@/capabilities/mbo/resources';
import { approvalWorkflowSetupSchema } from '@/capabilities/approval_workflow/setupSchema';
import { approvalWorkflowResources } from '@/capabilities/approval_workflow/resources';
import { patentIpAssetSetupSchema } from '@/capabilities/patent_ip_asset/setupSchema';
import { patentIpAssetResources } from '@/capabilities/patent_ip_asset/resources';
import { researchProjectSetupSchema } from '@/capabilities/research_project/setupSchema';
import { researchProjectResources } from '@/capabilities/research_project/resources';
import { whistleblowerGrievanceSetupSchema } from '@/capabilities/whistleblower_grievance/setupSchema';
import { whistleblowerGrievanceResources } from '@/capabilities/whistleblower_grievance/resources';
import { hazardousSubstanceMsdsSetupSchema } from '@/capabilities/hazardous_substance_msds/setupSchema';
import { hazardousSubstanceMsdsResources } from '@/capabilities/hazardous_substance_msds/resources';

export const CAPABILITY_BUNDLES = {
  booking: {
    capabilityId: 'booking',
    setupSchema: bookingSetupSchema,
    resources: bookingResources,
  },
  inventory: {
    capabilityId: 'inventory',
    setupSchema: inventorySetupSchema,
    resources: inventoryResources,
  },
  seat_room: {
    capabilityId: 'seat_room',
    setupSchema: seatRoomSetupSchema,
    resources: seatRoomResources,
  },
  rental_equipment: {
    capabilityId: 'rental_equipment',
    setupSchema: rentalEquipmentSetupSchema,
    resources: rentalEquipmentResources,
  },
  maintenance_checklist: {
    capabilityId: 'maintenance_checklist',
    setupSchema: maintenanceChecklistSetupSchema,
    resources: maintenanceChecklistResources,
  },
  task_pipeline: {
    capabilityId: 'task_pipeline',
    setupSchema: taskPipelineSetupSchema,
    resources: taskPipelineResources,
  },
  safety_consent: {
    capabilityId: 'safety_consent',
    setupSchema: safetyConsentSetupSchema,
    resources: safetyConsentResources,
  },
  shuttle_dispatch: {
    capabilityId: 'shuttle_dispatch',
    setupSchema: shuttleDispatchSetupSchema,
    resources: shuttleDispatchResources,
  },
  volunteer_activity: {
    capabilityId: 'volunteer_activity',
    setupSchema: volunteerActivitySetupSchema,
    resources: volunteerActivityResources,
  },
  meal_survey: {
    capabilityId: 'meal_survey',
    setupSchema: mealSurveySetupSchema,
    resources: mealSurveyResources,
  },
  office_supply_request: {
    capabilityId: 'office_supply_request',
    setupSchema: officeSupplyRequestSetupSchema,
    resources: officeSupplyRequestResources,
  },
  recipe_bom: {
    capabilityId: 'recipe_bom',
    setupSchema: recipeBomSetupSchema,
    resources: recipeBomResources,
  },
  equipment_lifecycle: {
    capabilityId: 'equipment_lifecycle',
    setupSchema: equipmentLifecycleSetupSchema,
    resources: equipmentLifecycleResources,
  },
  sop_risk_assessment: {
    capabilityId: 'sop_risk_assessment',
    setupSchema: sopRiskAssessmentSetupSchema,
    resources: sopRiskAssessmentResources,
  },
  supply_restock: {
    capabilityId: 'supply_restock',
    setupSchema: supply_restockSetupSchema,
    resources: supply_restockResources,
  },
  facility_incident_report: {
    capabilityId: 'facility_incident_report',
    setupSchema: facilityIncidentReportSetupSchema,
    resources: facilityIncidentReportResources,
  },
  mbo: {
    capabilityId: 'mbo',
    setupSchema: mboSetupSchema,
    resources: mboResources,
  },
  approval_workflow: {
    capabilityId: 'approval_workflow',
    setupSchema: approvalWorkflowSetupSchema,
    resources: approvalWorkflowResources,
  },
  patent_ip_asset: {
    capabilityId: 'patent_ip_asset',
    setupSchema: patentIpAssetSetupSchema,
    resources: patentIpAssetResources,
  },
  research_project: {
    capabilityId: 'research_project',
    setupSchema: researchProjectSetupSchema,
    resources: researchProjectResources,
  },
  whistleblower_grievance: {
    capabilityId: 'whistleblower_grievance',
    setupSchema: whistleblowerGrievanceSetupSchema,
    resources: whistleblowerGrievanceResources,
  },
  hazardous_substance_msds: {
    capabilityId: 'hazardous_substance_msds',
    setupSchema: hazardousSubstanceMsdsSetupSchema,
    resources: hazardousSubstanceMsdsResources,
  },
} as Partial<Record<BundledPresetCapabilityId, CapabilityModuleBundle>> as Record<
  BundledPresetCapabilityId,
  CapabilityModuleBundle
>;

registerCapabilityBundles(CAPABILITY_BUNDLES);

export const INDUSTRY_PRESETS: Record<string, IndustryPresetDefinition> = {
  personal_plant_ops: {
    id: 'personal_plant_ops',
    theme: {
      accentColor: 'emerald',
      badgeEmoji: '🏭',
    },
    starterPassTemplates: [
      {
        name: '현장 안전교육 이수 패스',
        passType: 'COUNT_BASED',
        totalCount: 4,
        validityDays: 365,
        recommendedPrice: 0,
        badge: '사내',
      },
      {
        name: '공용 장비 사용 허가권',
        passType: 'COUNT_BASED',
        totalCount: 10,
        validityDays: 90,
        recommendedPrice: 0,
        badge: '추천',
      },
    ],
    terms: {
      customer: '운영자',
      instructor: '작업자',
      space: '운영베이',
      pass: '작업티켓',
      fee: '비용',
    },
    operatingHours: {
      day_type: 'WEEKDAY',
      start_time: '09:00',
      end_time: '18:00',
      slot_minutes: 60,
    },
    facilities: {
      hasDepartments: true,
    },
    name: 'EP_apps',
    description:
      '소규모 현장용: 결재·안전·자재·공용자원·노경 건의·조직도·MBO·연구과제·연구소 포털. 급여·휴가·전사 장부는 포함하지 않습니다.',
    category: 'manufacturing',
    capabilities: [
      'approval_workflow',
      'sop_risk_assessment',
      'facility_incident_report',
      'safety_consent',
      'maintenance_checklist',
      'inventory',
      'recipe_bom',
      'supply_restock',
      'booking',
      'seat_room',
      'rental_equipment',
      'whistleblower_grievance',
      'task_pipeline',
      'mbo',
      'research_project',
      'patent_ip_asset',
      'equipment_lifecycle',
      'volunteer_activity',
      'meal_survey',
      'office_supply_request',
      'shuttle_dispatch',
      'hazardous_substance_msds',
    ] as const,
    requiredCapabilities: [
      'approval_workflow',
      'inventory',
      'booking',
      'whistleblower_grievance',
      'mbo',
      'research_project',
      'sop_risk_assessment',
      'facility_incident_report',
      'supply_restock',
    ] as const,
    optionalCapabilities: [
      'safety_consent',
      'maintenance_checklist',
      'recipe_bom',
      'rental_equipment',
      'seat_room',
      'task_pipeline',
      'patent_ip_asset',
      'equipment_lifecycle',
      'volunteer_activity',
      'meal_survey',
      'office_supply_request',
      'shuttle_dispatch',
      'hazardous_substance_msds',
    ] as const,
    roles: [
      {
        name: '대표이사 / 공장장',
        rank_order: 100,
        permissions: ['*'],
        description: '전사 총괄 및 최종 결재 권한',
      },
      {
        name: '본부장 / 실장',
        rank_order: 200,
        permissions: ['approval_workflow:*', 'mbo:*', 'task_pipeline:*', 'research_project:*', 'resources:*'],
        description: '본부/실 단위 총괄 관리자 (하위 그룹/팀 전체 통할)',
      },
      {
        name: '그룹장 / 센터장',
        rank_order: 300,
        permissions: ['approval_workflow:*', 'mbo:*', 'task_pipeline:*', 'research_project:update'],
        description: '중간 조직 관리자 (관할 팀 및 파트 통할)',
      },
      {
        name: '팀장 / 리더',
        rank_order: 400,
        permissions: ['approval_workflow:submit', 'approval_workflow:view', 'mbo:update', 'task_pipeline:*'],
        description: '부서/팀 관리자 (팀원 MBO 열람 및 부서 업무 관리)',
      },
      {
        name: '파트장 / 셀리더',
        rank_order: 500,
        permissions: ['task_pipeline:update', 'mbo:view', 'approval_workflow:submit'],
        description: '소규모 세부 파트 리더',
      },
      {
        name: '팀원 / 사원',
        rank_order: 900,
        permissions: ['booking:book', 'whistleblower_grievance:create', 'mbo:view', 'research_project:view'],
        description: '일반 실무자 (직무 기능 권한은 개인별로 부여)',
      },
    ],
    resourceTypes: [
      { name: '1호 업무용 차량', type: 'vehicle', capacity: 1 },
      { name: '회의실', type: 'room', capacity: 8 },
      { name: '시험·계측 장비', type: 'equipment', capacity: 1 },
    ],
    defaultSettings: {
      fleet_catalog_kind: 'vehicle',
      grievances_named_default: true,
      org_chart_enabled: true,
      resource_types_require_approval_default: true,
      hidden_capabilities: ['recipe_bom', 'rental_equipment', 'safety_consent'],
    },
    businessRules: {
      exclude_payroll: true,
      incident_capa_linkage: true,
    },
    readinessLevel: 'isolated',
  },
};

export const PRESET_ALIASES: Record<string, string> = {
  personal_plant: 'personal_plant_ops',
  plant_ops: 'personal_plant_ops',
  ep_apps: 'personal_plant_ops',
  EP_apps: 'personal_plant_ops',
};

export function getIndustryPreset(presetId: string): IndustryPresetDefinition | undefined {
  if (!presetId) return undefined;
  const direct = INDUSTRY_PRESETS[presetId];
  if (direct) return direct;
  const aliasedKey = PRESET_ALIASES[presetId];
  if (aliasedKey) return INDUSTRY_PRESETS[aliasedKey];
  return undefined;
}

export function listIndustryPresets(): IndustryPresetDefinition[] {
  return Object.values(INDUSTRY_PRESETS);
}

export function registerCapabilityBundle(bundle: CapabilityModuleBundle): void {
  (CAPABILITY_BUNDLES as Record<string, CapabilityModuleBundle>)[bundle.capabilityId] = bundle;
}

export function registerIndustryPreset(preset: IndustryPresetDefinition): void {
  INDUSTRY_PRESETS[preset.id] = preset;
}
