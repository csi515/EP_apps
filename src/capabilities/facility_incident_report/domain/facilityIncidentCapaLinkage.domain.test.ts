/**
 * facility_incident_report × maintenance CAPA 연동 도메인
 * 실행: npm run test:facility-incident-capa
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAINTENANCE_CAPA_INCIDENT_METADATA_SOURCE,
  mapCapaTicketDraftToFacilityIncidentCreateValues,
} from '@/capabilities/maintenance_checklist/domain/maintenanceCapaIncidentLinkage';
import type { CapaTicketDraft } from '@/capabilities/maintenance_checklist/domain/maintenanceChecklistEngine';
import { transitionIncidentStatus } from './incidentReportEngine';

const CAPA_DRAFT: CapaTicketDraft = {
  ticketNumber: 'CAPA-TEST-001',
  checklistItemId: 'item-42',
  checklistItemTitle: '보일러 압력',
  failureReason: '상한 초과',
  priority: 'CRITICAL',
  status: 'OPEN',
  assignedTeam: '시설팀',
  inspectorName: '점검자',
  reportedAt: '2026-11-26T10:00:00.000Z',
  correctiveActionPlan: '긴급 감압 및 재점검',
};

describe('facility_incident_report CAPA linkage', () => {
  it('maintenance_checklist 소스 메타데이터 필수 키를 유지한다', () => {
    const create = mapCapaTicketDraftToFacilityIncidentCreateValues(CAPA_DRAFT);
    assert.equal(create.status, 'open');
    assert.equal(create.metadata.source, MAINTENANCE_CAPA_INCIDENT_METADATA_SOURCE);
    assert.equal(create.metadata.maintenance_checklist_item_id, 'item-42');
    assert.equal(create.metadata.capa_ticket_number, 'CAPA-TEST-001');
    assert.equal(create.metadata.maintenance_checklist_item_title, '보일러 압력');
    assert.equal(create.metadata.capa_priority, 'CRITICAL');
  });

  it('open 상태 CAPA 연계 사고의 상태 전이는 엔진 규칙을 따른다 (fail-closed)', () => {
    assert.equal(transitionIncidentStatus('open', 'investigating').valid, true);
    assert.equal(transitionIncidentStatus('open', 'insurance_processing').valid, false);
    assert.equal(transitionIncidentStatus('open', 'resolved').valid, false);
    const closed = transitionIncidentStatus('open', 'resolved', {
      preventativeAction: CAPA_DRAFT.correctiveActionPlan!,
    });
    assert.equal(closed.valid, true);
  });
});