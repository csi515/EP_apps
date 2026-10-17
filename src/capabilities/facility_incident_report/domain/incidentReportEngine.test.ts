import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateIncidentSeverity,
  transitionIncidentStatus,
  renderIncidentReportSvg,
  formatIncidentNotificationText,
  type IncidentReportItem,
} from './incidentReportEngine';

describe('facility_incident_report - domain engine', () => {
  it('병원 이송 시 severe 등급으로 자동 판정된다', () => {
    const severity = evaluateIncidentSeverity({ hospitalTransported: true });
    assert.equal(severity, 'severe');
  });

  it('골절/출혈 발생 시 moderate 등급으로 판정된다', () => {
    const severity = evaluateIncidentSeverity({
      hospitalTransported: false,
      hasFractureOrBleeding: true,
    });
    assert.equal(severity, 'moderate');
  });

  it('기물 파손 100만원 이상 시 severe 등급으로 판정된다', () => {
    const severity = evaluateIncidentSeverity({
      hospitalTransported: false,
      propertyDamageAmount: 1500000,
    });
    assert.equal(severity, 'severe');
  });

  it('상태 전이 시 올바른 순서를 보장한다', () => {
    const check1 = transitionIncidentStatus('open', 'investigating');
    assert.equal(check1.valid, true);

    // 보험 청구 번호 없이 insurance_processing 전이 시 차단
    const check2 = transitionIncidentStatus('investigating', 'insurance_processing');
    assert.equal(check2.valid, false);

    const check3 = transitionIncidentStatus('investigating', 'insurance_processing', {
      insuranceClaimNumber: 'INS-2026-001',
    });
    assert.equal(check3.valid, true);

    // 재발방지대책 없이 resolved 전이 시 차단
    const check4 = transitionIncidentStatus('insurance_processing', 'resolved');
    assert.equal(check4.valid, false);

    const check5 = transitionIncidentStatus('insurance_processing', 'resolved', {
      preventativeAction: '매트 보강 및 안전 가드 설치 완료',
    });
    assert.equal(check5.valid, true);
  });

  it('W3C SVG 사고경위서 및 알림 텍스트가 정상 조립된다', () => {
    const report: IncidentReportItem = {
      id: 'inc-1',
      organizationId: 'org-1',
      incidentTitle: '트램펄린 착지 중 발목 접질림',
      incidentDate: '2026-10-17T14:30:00Z',
      incidentType: 'injury',
      severity: 'moderate',
      locationInFacility: '2층 키즈 트램펄린 존',
      involvedPersonName: '김민준',
      involvedPersonRole: '원생',
      description: '트램펄린 점프 후 착지하면서 발목을 삐끗함',
      hospitalTransported: false,
      emergencyActionTaken: '아이싱 및 압박 붕대 처치 완료',
      insuranceClaimed: false,
      status: 'open',
      createdAt: '2026-10-17T14:35:00Z',
      updatedAt: '2026-10-17T14:35:00Z',
    };

    const svg = renderIncidentReportSvg(report);
    assert.ok(svg.includes('<svg'));
    assert.ok(svg.includes('트램펄린 착지 중 발목 접질림'));
    assert.ok(svg.includes('김민준'));

    const text = formatIncidentNotificationText(report);
    assert.ok(text.includes('[시설 안전사고 경위 및 안내]'));
    assert.ok(text.includes('김민준'));
    assert.ok(text.includes('아이싱 및 압박 붕대 처치 완료'));
  });
});
