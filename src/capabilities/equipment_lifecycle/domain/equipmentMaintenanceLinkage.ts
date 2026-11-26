import type { CapaTicketDraft } from '@/capabilities/maintenance_checklist/domain/maintenanceChecklistEngine';
import type { EquipmentAsset, EquipmentUrgencyLevel } from './equipmentLifecycleEngine';

export const EQUIPMENT_MAINTENANCE_LINKAGE_METADATA_SOURCE = 'equipment_lifecycle' as const;
export const TASK_ORDERS_RESOURCE = 'task_orders';

export type EquipmentBreakdownReportDraft = {
  assetId: string;
  assetName: string;
  category: string;
  assetTagNumber?: string;
  breakdownNotes: string;
  reportedAt: string;
  reportedByName: string;
  urgencyBeforeReport?: EquipmentUrgencyLevel;
};

export type EquipmentBreakdownDraftAssessment =
  | { ok: true }
  | { ok: false; reason: 'missingAssetId' | 'emptyNotes' | 'emptyReporter' };

export type EquipmentMaintenancePersistContext = {
  organizationId: string | null;
  equipmentMaintenanceLinkageEnabled: boolean;
  supabaseConfigured: boolean;
};

export type EquipmentMaintenancePersistAssessment =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'linkageDisabled'
        | 'organizationRequired'
        | 'supabaseNotConfigured'
        | 'invalidDraft';
      draftReason?: EquipmentBreakdownDraftAssessment extends { ok: false; reason: infer R }
        ? R
        : never;
    };

export type MaintenanceChecklistEmergencyCreateValues = {
  organization_id: string;
  title: string;
  status: string;
  due_at: string | null;
  items: Record<string, unknown>[];
};

export type TaskOrderMaintenanceCreateValues = {
  organization_id: string;
  order_number: string;
  order_type: 'maintenance';
  title: string;
  target_item_name: string | null;
  customer_name: string | null;
  current_stage: 'RECEIVED';
  stage_entered_at: string;
  sla_hours: number;
  diagnosis: string | null;
  details: Record<string, unknown>;
};

function synthesizeEmergencyTicketNumber(reportedAt: string): string {
  const dateStr = reportedAt.slice(2, 10).replace(/-/g, '');
  return `EQ-BRK-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;
}

function synthesizeTaskOrderNumber(reportedAt: string): string {
  const dateStr = reportedAt.slice(2, 10).replace(/-/g, '');
  return `MO-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;
}

function breakdownPriority(draft: EquipmentBreakdownReportDraft): CapaTicketDraft['priority'] {
  if (draft.urgencyBeforeReport === 'overdue' || draft.urgencyBeforeReport === 'breakdown') {
    return 'CRITICAL';
  }
  return 'HIGH';
}

function buildEquipmentMaintenanceMetadata(draft: EquipmentBreakdownReportDraft): Record<string, unknown> {
  return {
    source: EQUIPMENT_MAINTENANCE_LINKAGE_METADATA_SOURCE,
    equipment_asset_id: draft.assetId,
    equipment_asset_name: draft.assetName,
    equipment_category: draft.category,
    equipment_asset_tag: draft.assetTagNumber ?? null,
    breakdown_notes: draft.breakdownNotes.trim(),
    reported_by: draft.reportedByName,
    reported_at: draft.reportedAt,
    urgency_before_report: draft.urgencyBeforeReport ?? null,
  };
}

export function buildEquipmentBreakdownReportDraft(
  asset: EquipmentAsset,
  breakdownNotes: string,
  options: { reportedAt?: string; reportedByName?: string; urgencyBeforeReport?: EquipmentUrgencyLevel } = {},
): EquipmentBreakdownReportDraft {
  return {
    assetId: asset.id,
    assetName: asset.name,
    category: asset.category,
    assetTagNumber: asset.assetTagNumber,
    breakdownNotes: breakdownNotes.trim(),
    reportedAt: options.reportedAt ?? new Date().toISOString(),
    reportedByName: options.reportedByName ?? '현장 담당자',
    urgencyBeforeReport: options.urgencyBeforeReport ?? asset.status,
  };
}

export function assessEquipmentBreakdownDraft(
  draft: EquipmentBreakdownReportDraft,
): EquipmentBreakdownDraftAssessment {
  if (!draft.assetId?.trim()) {
    return { ok: false, reason: 'missingAssetId' };
  }
  if (!draft.breakdownNotes?.trim()) {
    return { ok: false, reason: 'emptyNotes' };
  }
  if (!draft.reportedByName?.trim()) {
    return { ok: false, reason: 'emptyReporter' };
  }
  return { ok: true };
}

/**
 * 설비 고장 신고 초안 → 점검 CAPA 티켓 초안 (maintenance_checklist 엔진 호환)
 */
export function mapEquipmentBreakdownToMaintenanceTicketDraft(
  draft: EquipmentBreakdownReportDraft,
): CapaTicketDraft {
  const notes = draft.breakdownNotes.trim();
  const tagSuffix = draft.assetTagNumber ? ` [${draft.assetTagNumber}]` : '';
  return {
    ticketNumber: synthesizeEmergencyTicketNumber(draft.reportedAt),
    checklistItemId: `equipment-asset-${draft.assetId}`,
    checklistItemTitle: `${draft.assetName}${tagSuffix}`,
    failureReason: notes,
    priority: breakdownPriority(draft),
    status: 'OPEN',
    assignedTeam: '시설안전/유지보수팀',
    inspectorName: draft.reportedByName,
    reportedAt: draft.reportedAt,
    correctiveActionPlan: `1차 조치: ${draft.assetName} 가동 중지 및 현장 격리 후 긴급 점검 (${notes})`,
  };
}

/**
 * 설비 고장 신고 초안 → `maintenance_checklists` 생성 payload (snake_case, Refine useCreate용)
 */
export function mapEquipmentBreakdownToMaintenanceChecklistCreateValues(
  draft: EquipmentBreakdownReportDraft,
  organizationId: string,
): MaintenanceChecklistEmergencyCreateValues {
  const ticket = mapEquipmentBreakdownToMaintenanceTicketDraft(draft);
  const dueAt = new Date(draft.reportedAt);
  dueAt.setHours(dueAt.getHours() + 24);
  return {
    organization_id: organizationId,
    title: `[긴급] ${draft.assetName} 고장 점검`,
    status: 'open',
    due_at: dueAt.toISOString(),
    items: [
      {
        kind: 'equipment_breakdown_emergency',
        is_required: true,
        is_completed: false,
        ticket_number: ticket.ticketNumber,
        failure_reason: ticket.failureReason,
        priority: ticket.priority,
        metadata: buildEquipmentMaintenanceMetadata(draft),
      },
    ],
  };
}

/**
 * 설비 고장 신고 초안 → `task_orders` 생성 payload (snake_case, Refine useCreate용)
 */
export function mapEquipmentBreakdownToTaskOrderCreateValues(
  draft: EquipmentBreakdownReportDraft,
  organizationId: string,
  options: { slaHours?: number } = {},
): TaskOrderMaintenanceCreateValues {
  const slaHours = options.slaHours ?? (breakdownPriority(draft) === 'CRITICAL' ? 8 : 24);
  const ticket = mapEquipmentBreakdownToMaintenanceTicketDraft(draft);
  return {
    organization_id: organizationId,
    order_number: synthesizeTaskOrderNumber(draft.reportedAt),
    order_type: 'maintenance',
    title: `[설비 정비] ${draft.assetName}`,
    target_item_name: draft.assetName,
    customer_name: '내부 설비 유지보수',
    current_stage: 'RECEIVED',
    stage_entered_at: draft.reportedAt,
    sla_hours: slaHours,
    diagnosis: draft.breakdownNotes.trim(),
    details: {
      ...buildEquipmentMaintenanceMetadata(draft),
      maintenance_ticket_number: ticket.ticketNumber,
      maintenance_checklist_item_id: ticket.checklistItemId,
      capa_priority: ticket.priority,
    },
  };
}

export function assessEquipmentMaintenancePersist(
  ctx: EquipmentMaintenancePersistContext,
  draft: EquipmentBreakdownReportDraft,
): EquipmentMaintenancePersistAssessment {
  if (!ctx.equipmentMaintenanceLinkageEnabled) {
    return { ok: false, reason: 'linkageDisabled' };
  }
  if (!ctx.supabaseConfigured) {
    return { ok: false, reason: 'supabaseNotConfigured' };
  }
  if (!ctx.organizationId?.trim()) {
    return { ok: false, reason: 'organizationRequired' };
  }
  const draftCheck = assessEquipmentBreakdownDraft(draft);
  if (!draftCheck.ok) {
    return { ok: false, reason: 'invalidDraft', draftReason: draftCheck.reason };
  }
  return { ok: true };
}