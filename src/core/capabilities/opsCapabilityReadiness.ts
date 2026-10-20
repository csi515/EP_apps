/**
 * 현장 Ops 11개 Capability의 persistence / opsReadiness 단일 스냅샷.
 * 프리셋 readinessLevel과 별개로, Ops OS 완비 게이트를 측정한다.
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
    refineResource: 'sop_risk_assessment',
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
