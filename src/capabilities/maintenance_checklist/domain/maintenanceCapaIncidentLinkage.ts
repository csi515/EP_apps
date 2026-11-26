import type { CapaTicketDraft } from './maintenanceChecklistEngine';
import type { IncidentSeverity } from '@/capabilities/facility_incident_report/domain/incidentReportEngine';

export const FACILITY_INCIDENT_REPORT_RESOURCE = 'facility_incident_reports';

export const MAINTENANCE_CAPA_INCIDENT_METADATA_SOURCE = 'maintenance_checklist' as const;

export type MaintenanceCapaPersistContext = {
  organizationId: string | null;
  incidentCapaLinkageEnabled: boolean;
  supabaseConfigured: boolean;
};

export type MaintenanceCapaPersistAssessment =
  | { ok: true }
  | { ok: false; reason: 'linkageDisabled' | 'organizationRequired' | 'supabaseNotConfigured' };

export type FacilityIncidentReportCreateValues = {
  incident_title: string;
  incident_date: string;
  incident_type: 'equipment_failure';
  severity: IncidentSeverity;
  location_in_facility: string;
  involved_person_name: string;
  involved_person_role: string;
  description: string;
  emergency_action_taken: string;
  preventative_action: string | null;
  hospital_transported: boolean;
  insurance_claimed: boolean;
  status: 'open';
  metadata: Record<string, unknown>;
};

function capaPriorityToSeverity(priority: CapaTicketDraft['priority']): IncidentSeverity {
  return priority === 'CRITICAL' ? 'critical' : 'moderate';
}

function buildMaintenanceCapaMetadata(draft: CapaTicketDraft): Record<string, unknown> {
  return {
    source: MAINTENANCE_CAPA_INCIDENT_METADATA_SOURCE,
    maintenance_checklist_item_id: draft.checklistItemId,
    maintenance_checklist_item_title: draft.checklistItemTitle,
    capa_ticket_number: draft.ticketNumber,
    capa_priority: draft.priority,
    capa_status: draft.status,
    assigned_team: draft.assignedTeam,
    inspector_name: draft.inspectorName,
    failure_reason: draft.failureReason,
    reported_at: draft.reportedAt,
  };
}

/**
 * 점검 CAPA 초안 → `facility_incident_reports` 생성 payload (snake_case, Refine useCreate용)
 */
export function mapCapaTicketDraftToFacilityIncidentCreateValues(
  draft: CapaTicketDraft,
): FacilityIncidentReportCreateValues {
  const plan = draft.correctiveActionPlan?.trim() ?? '';
  return {
    incident_title: `[CAPA] ${draft.checklistItemTitle} — 공차 이탈`,
    incident_date: draft.reportedAt,
    incident_type: 'equipment_failure',
    severity: capaPriorityToSeverity(draft.priority),
    location_in_facility: '시설 점검 구역',
    involved_person_name: draft.inspectorName,
    involved_person_role: '점검 담당',
    description: `${draft.failureReason}\n(티켓: ${draft.ticketNumber})`,
    emergency_action_taken: plan || '1차 현장 격리 및 유지보수팀 통보',
    preventative_action: plan || null,
    hospital_transported: false,
    insurance_claimed: false,
    status: 'open',
    metadata: buildMaintenanceCapaMetadata(draft),
  };
}

export type FacilityIncidentReportRowRef = {
  id: string;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * 동일 점검 항목에 대한 미종결 사고 보고가 있으면 신규 생성 대신 연결
 */
export function findExistingMaintenanceCapaIncident(
  reports: FacilityIncidentReportRowRef[],
  checklistItemId: string,
): FacilityIncidentReportRowRef | null {
  for (const report of reports) {
    const meta = report.metadata;
    if (!meta || typeof meta !== 'object') continue;
    if (meta.source !== MAINTENANCE_CAPA_INCIDENT_METADATA_SOURCE) continue;
    if (meta.maintenance_checklist_item_id !== checklistItemId) continue;
    if (report.status === 'resolved') continue;
    return report;
  }
  return null;
}

export function buildCapaIncidentLinkUpdateValues(
  draft: CapaTicketDraft,
  existingMetadata?: Record<string, unknown> | null,
): Record<string, unknown> {
  const mergedMeta = {
    ...(existingMetadata && typeof existingMetadata === 'object' ? existingMetadata : {}),
    ...buildMaintenanceCapaMetadata(draft),
    capa_linked_at: new Date().toISOString(),
    capa_link_mode: 'maintenance_checklist_reconcile',
  };
  const plan = draft.correctiveActionPlan?.trim();
  return {
    metadata: mergedMeta,
    ...(plan ? { preventative_action: plan, emergency_action_taken: plan } : {}),
    updated_at: new Date().toISOString(),
  };
}

export function assessMaintenanceCapaIncidentPersist(
  ctx: MaintenanceCapaPersistContext,
): MaintenanceCapaPersistAssessment {
  if (!ctx.incidentCapaLinkageEnabled) {
    return { ok: false, reason: 'linkageDisabled' };
  }
  if (!ctx.supabaseConfigured) {
    return { ok: false, reason: 'supabaseNotConfigured' };
  }
  if (!ctx.organizationId?.trim()) {
    return { ok: false, reason: 'organizationRequired' };
  }
  return { ok: true };
}