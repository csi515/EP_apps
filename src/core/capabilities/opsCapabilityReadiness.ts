/**
 * 현장 Ops 11개 Capability의 persistence / opsReadiness 단일 스냅샷.
 * 프리셋 readinessLevel과 별개로, Ops OS 완비 게이트를 측정한다.
 *
 * `OPS_CAPABILITY_IDS`는 현장 Ops 번들(출석·예약·락커 등) 스냅샷이며,
 * `PLANT_REQUIRED_CAPABILITY_IDS`(`personal_plant_ops.requiredCapabilities`)와
 * 목록이 다르다. plant 필수 cap 목록이 재정의되기 전까지 불일치는 의도적이다.
 * R5 `ops_verified` 승급 시 두 목록 정렬·게이트 연동은 후속 작업이다.
 */

export type OpsPersistence = 'supabase' | 'local' | 'hybrid';
export type OpsReadiness = 'demo' | 'basic_ui' | 'ops_verified';

export const OPS_CAPABILITY_IDS = [
  'attendance',
  'booking',
  'locker',
  'space_turnaround',
  'seat_room',
  'rental_equipment',
  'equipment_lifecycle',
  'maintenance_checklist',
  'safety_consent',
  'sop_risk_assessment',
  'hygiene_haccp_log',
] as const;

export type OpsCapabilityId = (typeof OPS_CAPABILITY_IDS)[number];

/** `personal_plant_ops.requiredCapabilities`와 동기 유지 (런처·메뉴 필수 cap). R5 게이트 예비 상수. */
export const PLANT_REQUIRED_CAPABILITY_IDS = [
  'approval_workflow',
  'inventory',
  'booking',
  'whistleblower_grievance',
  'mbo',
  'research_project',
  'sop_risk_assessment',
  'supply_restock',
] as const;

export type PlantRequiredCapabilityId = (typeof PLANT_REQUIRED_CAPABILITY_IDS)[number];

const OPS_CAPABILITY_ID_SET = new Set<string>(OPS_CAPABILITY_IDS);

/** plant 필수 cap 중 Ops 11종 스냅샷에 포함된 id (현재 교집합). */
export function plantRequiredInOpsSnapshot(): PlantRequiredCapabilityId[] {
  return PLANT_REQUIRED_CAPABILITY_IDS.filter((id) => OPS_CAPABILITY_ID_SET.has(id));
}

export interface OpsCapabilityMeta {
  persistence: OpsPersistence;
  opsReadiness: OpsReadiness;
  /** GenericIndustryShell tab key */
  shellTab: string | null;
  /** Refine resource name */
  refineResource: string;
}

export const OPS_CAPABILITY_READINESS: Record<OpsCapabilityId, OpsCapabilityMeta> = {
  attendance: {
    persistence: 'supabase',
    opsReadiness: 'ops_verified',
    shellTab: 'attendance',
    refineResource: 'attendance',
  },
  booking: {
    persistence: 'supabase',
    opsReadiness: 'ops_verified',
    shellTab: 'booking',
    refineResource: 'bookings',
  },
  locker: {
    persistence: 'supabase',
    opsReadiness: 'ops_verified',
    shellTab: 'lockers',
    refineResource: 'lockers',
  },
  space_turnaround: {
    persistence: 'supabase',
    opsReadiness: 'ops_verified',
    shellTab: 'space-turnaround',
    refineResource: 'space_turnarounds',
  },
  seat_room: {
    persistence: 'supabase',
    opsReadiness: 'ops_verified',
    shellTab: 'seat-rooms',
    refineResource: 'seat_rooms',
  },
  rental_equipment: {
    persistence: 'supabase',
    opsReadiness: 'ops_verified',
    shellTab: 'rentals',
    refineResource: 'rental_equipments',
  },
  equipment_lifecycle: {
    persistence: 'supabase',
    opsReadiness: 'ops_verified',
    shellTab: 'equipment-lifecycle',
    refineResource: 'equipment_lifecycle',
  },
  maintenance_checklist: {
    persistence: 'supabase',
    opsReadiness: 'ops_verified',
    shellTab: 'maintenance',
    refineResource: 'maintenance_checklists',
  },
  safety_consent: {
    persistence: 'supabase',
    opsReadiness: 'ops_verified',
    shellTab: 'consents',
    refineResource: 'safety_consents',
  },
  sop_risk_assessment: {
    persistence: 'supabase',
    opsReadiness: 'ops_verified',
    shellTab: 'sop-risk',
    refineResource: 'risk_assessments',
  },
  hygiene_haccp_log: {
    persistence: 'supabase',
    opsReadiness: 'ops_verified',
    shellTab: 'hygiene-log',
    refineResource: 'hygiene_haccp_log',
  },
};

/** Refine 리소스 이름 → Capability id (hidden_capabilities 필터용) */
export const OPS_RESOURCE_TO_CAPABILITY: Record<string, OpsCapabilityId> = Object.fromEntries(
  OPS_CAPABILITY_IDS.map((id) => [OPS_CAPABILITY_READINESS[id].refineResource, id]),
) as Record<string, OpsCapabilityId>;

export function isOpsVerified(id: OpsCapabilityId): boolean {
  return OPS_CAPABILITY_READINESS[id].opsReadiness === 'ops_verified'
    && OPS_CAPABILITY_READINESS[id].persistence === 'supabase';
}

export function assertAllOpsVerified(): void {
  for (const id of OPS_CAPABILITY_IDS) {
    if (!isOpsVerified(id)) {
      throw new Error(`Ops capability not verified: ${id}`);
    }
  }
}

export function resourceHiddenByCapabilities(
  resourceName: string,
  hiddenCapabilities: readonly string[],
): boolean {
  if (hiddenCapabilities.length === 0) return false;
  const hidden = new Set(hiddenCapabilities);
  const capId = OPS_RESOURCE_TO_CAPABILITY[resourceName];
  if (capId && hidden.has(capId)) return true;
  // 번들 리소스 이름과 capability id가 같은 경우
  if (hidden.has(resourceName)) return true;
  return false;
}
