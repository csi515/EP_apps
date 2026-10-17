import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateIncidentSeverity,
  transitionIncidentStatus,
  renderIncidentReportSvg,
  formatIncidentNotificationText,
  transitionCapaStage,
  evaluateLegalReportingRequirement,
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

  it('ISO 10.2 폐쇄 루프 CAPA 6단계 상태 전이를 완벽히 통제한다', () => {
    // 1. reported -> root_cause
    const s1 = transitionCapaStage('reported', 'root_cause');
    assert.equal(s1.valid, true);

    // 2. root_cause -> action_plan (근본원인 누락 시 실패)
    const s2Fail = transitionCapaStage('root_cause', 'action_plan', {});
    assert.equal(s2Fail.valid, false);
    assert.ok(s2Fail.reason?.includes('근본 원인'));

    const s2Pass = transitionCapaStage('root_cause', 'action_plan', {
      rootCause: {
        method: '5_why',
        directCause: '바닥 미끄러짐',
        rootCause: '배수 트렌치 청소 미흡 및 방수 코팅 마모',
      },
    });
    assert.equal(s2Pass.valid, true);

    // 3. action_plan -> implementation (조치계획 0건 시 실패)
    const s3Fail = transitionCapaStage('action_plan', 'implementation', { actions: [] });
    assert.equal(s3Fail.valid, false);

    const s3Pass = transitionCapaStage('action_plan', 'implementation', {
      actions: [
        {
          id: 'act-1',
          actionTitle: '논슬립 방수 에폭시 재시공',
          assigneeName: '시설팀장',
          dueDate: '2026-10-31',
          actionType: 'preventative_systemic',
        },
      ],
    });
    assert.equal(s3Pass.valid, true);

    // 4. implementation -> verification (미완료 조치 존재 시 실패)
    const s4Fail = transitionCapaStage('implementation', 'verification', {
      actions: [
        {
          id: 'act-1',
          actionTitle: '논슬립 방수 에폭시 재시공',
          assigneeName: '시설팀장',
          dueDate: '2026-10-31',
          actionType: 'preventative_systemic',
          // completedAt 누락
        },
      ],
    });
    assert.equal(s4Fail.valid, false);
    assert.ok(s4Fail.reason?.includes('미완료된 시정 조치'));

    const s4Pass = transitionCapaStage('implementation', 'verification', {
      actions: [
        {
          id: 'act-1',
          actionTitle: '논슬립 방수 에폭시 재시공',
          assigneeName: '시설팀장',
          dueDate: '2026-10-31',
          completedAt: '2026-10-25',
          actionType: 'preventative_systemic',
        },
      ],
    });
    assert.equal(s4Pass.valid, true);

    // 5. verification -> closed (효과성 미흡 or 재발 시 차단 및 재분석 강제)
    const s5Fail1 = transitionCapaStage('verification', 'closed', {
      verification: {
        verifiedAt: '2026-11-15',
        verifierName: '안전보건책임자',
        isEffective: false,
        recurrenceObserved: false,
        evidenceDescription: '시공 후에도 마찰계수 기준치 미달',
      },
    });
    assert.equal(s5Fail1.valid, false);
    assert.ok(s5Fail1.reason?.includes('유효성이 입증되지 않았거나'));

    const s5Pass = transitionCapaStage('verification', 'closed', {
      verification: {
        verifiedAt: '2026-11-15',
        verifierName: '안전보건책임자',
        isEffective: true,
        recurrenceObserved: false,
        evidenceDescription: '30일간 모니터링 결과 미끄럼 사고 0건 달성 및 마찰계수 0.6 이상',
      },
    });
    assert.equal(s5Pass.valid, true);
  });

  it('ISO 45001 아차사고 및 ISO 14001 환경오염 사고 법정 기한 및 절차를 판정한다', () => {
    // 1. 아차사고 (인명 피해 없으나 48시간 내 사내 조사 의무)
    const nearMissReq = evaluateLegalReportingRequirement('near_miss', 'minor');
    assert.equal(nearMissReq.isNearMiss, true);
    assert.equal(nearMissReq.requiresGovernmentReport, false);
    assert.equal(nearMissReq.internalInvestigationDeadlineHours, 48);

    // 2. 환경오염 유출 사고 (중대형 유출 시 24시간 내 지자체/환경청 신고 의무)
    const envSpillReq = evaluateLegalReportingRequirement('environmental_spill', 'critical');
    assert.equal(envSpillReq.isNearMiss, false);
    assert.equal(envSpillReq.requiresGovernmentReport, true);
    assert.equal(envSpillReq.reportingDeadlineHours, 24);
    assert.ok(envSpillReq.targetAuthority.includes('환경'));

    // 3. 일반 경미 사고
    const normalReq = evaluateLegalReportingRequirement('injury', 'minor');
    assert.equal(normalReq.requiresGovernmentReport, false);
  });
});
