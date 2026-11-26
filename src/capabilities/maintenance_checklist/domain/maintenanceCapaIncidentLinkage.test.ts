/**
 * 점검 CAPA → facility_incident_reports 매핑
 * 실행: npx tsx src/capabilities/maintenance_checklist/domain/maintenanceCapaIncidentLinkage.test.ts
 */
import assert from 'node:assert/strict';
import type { CapaTicketDraft } from './maintenanceChecklistEngine';
import {
  assessMaintenanceCapaIncidentPersist,
  buildCapaIncidentLinkUpdateValues,
  findExistingMaintenanceCapaIncident,
  mapCapaTicketDraftToFacilityIncidentCreateValues,
  MAINTENANCE_CAPA_INCIDENT_METADATA_SOURCE,
} from './maintenanceCapaIncidentLinkage';

const sampleDraft: CapaTicketDraft = {
  ticketNumber: 'CAPA-261126-401',
  checklistItemId: 'chk-uuid-1',
  checklistItemTitle: '냉동기 출구 온도',
  failureReason: '허용 상한 초과 (48.2℃/bar)',
  priority: 'CRITICAL',
  status: 'OPEN',
  assignedTeam: '시설안전/유지보수팀',
  inspectorName: '시설 관리자',
  reportedAt: '2026-11-26T09:15:00.000Z',
  correctiveActionPlan: '1차 조치: 가동 중단 후 엔지니어 긴급 점검',
};

const mapped = mapCapaTicketDraftToFacilityIncidentCreateValues(sampleDraft);
assert.equal(mapped.incident_type, 'equipment_failure');
assert.equal(mapped.severity, 'critical');
assert.equal(mapped.status, 'open');
assert.ok(mapped.incident_title.includes('냉동기 출구 온도'));
assert.equal(mapped.metadata.source, MAINTENANCE_CAPA_INCIDENT_METADATA_SOURCE);
assert.equal(mapped.metadata.maintenance_checklist_item_id, 'chk-uuid-1');
assert.equal(mapped.metadata.capa_ticket_number, 'CAPA-261126-401');
assert.ok(mapped.description.includes('CAPA-261126-401'));

const existing = findExistingMaintenanceCapaIncident(
  [
    {
      id: 'inc-1',
      status: 'open',
      metadata: {
        source: MAINTENANCE_CAPA_INCIDENT_METADATA_SOURCE,
        maintenance_checklist_item_id: 'chk-uuid-1',
      },
    },
    {
      id: 'inc-2',
      status: 'open',
      metadata: {
        source: MAINTENANCE_CAPA_INCIDENT_METADATA_SOURCE,
        maintenance_checklist_item_id: 'other-item',
      },
    },
  ],
  'chk-uuid-1',
);
assert.equal(existing?.id, 'inc-1');

assert.equal(
  findExistingMaintenanceCapaIncident(
    [{ id: 'inc-x', status: 'resolved', metadata: { source: MAINTENANCE_CAPA_INCIDENT_METADATA_SOURCE, maintenance_checklist_item_id: 'chk-uuid-1' } }],
    'chk-uuid-1',
  ),
  null,
);

const linkPatch = buildCapaIncidentLinkUpdateValues(sampleDraft, { prior_note: 'keep' });
assert.equal((linkPatch.metadata as Record<string, unknown>).prior_note, 'keep');
assert.equal((linkPatch.metadata as Record<string, unknown>).capa_ticket_number, 'CAPA-261126-401');
assert.equal(linkPatch.preventative_action, sampleDraft.correctiveActionPlan);

assert.equal(assessMaintenanceCapaIncidentPersist({
  organizationId: 'org-1',
  incidentCapaLinkageEnabled: true,
  supabaseConfigured: true,
}).ok, true);

assert.deepEqual(
  assessMaintenanceCapaIncidentPersist({
    organizationId: null,
    incidentCapaLinkageEnabled: true,
    supabaseConfigured: true,
  }),
  { ok: false, reason: 'organizationRequired' },
);

console.log('maintenanceCapaIncidentLinkage.test.ts: ok');