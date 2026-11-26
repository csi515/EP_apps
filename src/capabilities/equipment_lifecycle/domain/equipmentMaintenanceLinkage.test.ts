/**
 * equipment_lifecycle ↔ maintenance / task_orders 매핑
 * 실행: npm run test:equipment-maintenance-linkage
 */
import assert from 'node:assert/strict';
import {
  assessEquipmentBreakdownDraft,
  assessEquipmentMaintenancePersist,
  buildEquipmentBreakdownReportDraft,
  EQUIPMENT_MAINTENANCE_LINKAGE_METADATA_SOURCE,
  mapEquipmentBreakdownToMaintenanceChecklistCreateValues,
  mapEquipmentBreakdownToMaintenanceTicketDraft,
  mapEquipmentBreakdownToTaskOrderCreateValues,
} from './equipmentMaintenanceLinkage';
import type { EquipmentAsset } from './equipmentLifecycleEngine';

const sampleAsset: EquipmentAsset = {
  id: 'asset-reformer-3',
  name: '필라테스 리포머 3호기',
  category: 'fitness',
  assetTagNumber: 'GYM-2024-RF03',
  purchaseCost: 4_500_000,
  usefulLifeMonths: 60,
  installedDate: '2024-01-15T00:00:00.000Z',
  lastMaintenanceDate: '2026-08-01T00:00:00.000Z',
  maintenanceIntervalMonths: 6,
  cumulativeRepairCost: 120_000,
  status: 'due_soon',
};

const draft = buildEquipmentBreakdownReportDraft(
  sampleAsset,
  '와이어 케이블 유격 증가, 스프링 파손 위험',
  {
    reportedAt: '2026-11-26T11:30:00.000Z',
    reportedByName: '홍길동',
    urgencyBeforeReport: 'due_soon',
  },
);

assert.equal(assessEquipmentBreakdownDraft(draft).ok, true);

const ticket = mapEquipmentBreakdownToMaintenanceTicketDraft(draft);
assert.match(ticket.ticketNumber, /^EQ-BRK-/);
assert.equal(ticket.checklistItemId, 'equipment-asset-asset-reformer-3');
assert.equal(ticket.status, 'OPEN');
assert.equal(ticket.priority, 'HIGH');
assert.ok(ticket.failureReason.includes('스프링'));

const criticalDraft = buildEquipmentBreakdownReportDraft(
  { ...sampleAsset, status: 'breakdown' },
  '모터 과열로 즉시 가동 중지 필요',
  { urgencyBeforeReport: 'breakdown' },
);
const criticalTicket = mapEquipmentBreakdownToMaintenanceTicketDraft(criticalDraft);
assert.equal(criticalTicket.priority, 'CRITICAL');

const checklistCreate = mapEquipmentBreakdownToMaintenanceChecklistCreateValues(draft, 'org-plant-1');
assert.equal(checklistCreate.organization_id, 'org-plant-1');
assert.equal(checklistCreate.status, 'open');
assert.ok(checklistCreate.title.includes('리포머'));
const firstItem = checklistCreate.items[0] as Record<string, unknown>;
assert.match(String(firstItem.ticket_number), /^EQ-BRK-/);
const meta = firstItem.metadata as Record<string, unknown>;
assert.equal(meta.source, EQUIPMENT_MAINTENANCE_LINKAGE_METADATA_SOURCE);
assert.equal(meta.equipment_asset_id, 'asset-reformer-3');

const taskOrderCreate = mapEquipmentBreakdownToTaskOrderCreateValues(draft, 'org-plant-1');
assert.equal(taskOrderCreate.order_type, 'maintenance');
assert.equal(taskOrderCreate.current_stage, 'RECEIVED');
assert.match(taskOrderCreate.order_number, /^MO-/);
assert.equal(taskOrderCreate.target_item_name, sampleAsset.name);
assert.equal(taskOrderCreate.details.source, EQUIPMENT_MAINTENANCE_LINKAGE_METADATA_SOURCE);
assert.match(String(taskOrderCreate.details.maintenance_ticket_number), /^EQ-BRK-/);

assert.equal(
  assessEquipmentMaintenancePersist(
    {
      organizationId: 'org-plant-1',
      equipmentMaintenanceLinkageEnabled: true,
      supabaseConfigured: true,
    },
    draft,
  ).ok,
  true,
);

assert.deepEqual(
  assessEquipmentMaintenancePersist(
    {
      organizationId: null,
      equipmentMaintenanceLinkageEnabled: true,
      supabaseConfigured: true,
    },
    draft,
  ),
  { ok: false, reason: 'organizationRequired' },
);

assert.deepEqual(
  assessEquipmentMaintenancePersist(
    {
      organizationId: 'org-plant-1',
      equipmentMaintenanceLinkageEnabled: false,
      supabaseConfigured: true,
    },
    draft,
  ),
  { ok: false, reason: 'linkageDisabled' },
);

assert.deepEqual(
  assessEquipmentBreakdownDraft({
    ...draft,
    breakdownNotes: '   ',
  }),
  { ok: false, reason: 'emptyNotes' },
);

assert.deepEqual(
  assessEquipmentMaintenancePersist(
    {
      organizationId: 'org-plant-1',
      equipmentMaintenanceLinkageEnabled: true,
      supabaseConfigured: true,
    },
    { ...draft, breakdownNotes: '' },
  ),
  { ok: false, reason: 'invalidDraft', draftReason: 'emptyNotes' },
);

console.log('equipmentMaintenanceLinkage.test.ts: ok');