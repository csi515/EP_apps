import React, { useState } from 'react';
import {
  WorkStandardSOP,
  HazardRiskItem,
  calculateRiskLevel,
  evaluateRiskReduction,
  calculateSafetyAuditSummary,
} from '../domain/sopRiskAssessmentEngine';

const INITIAL_SOPS: WorkStandardSOP[] = [
  {
    sopId: 'sop-1',
    processName: '차량 리프트 하부 정비 작업',
    department: '정비 공정팀',
    requiredPPE: ['안전모', '보안경', '절단방지 안전장갑', '절연 안전화'],
    standardSteps: [
      { stepNumber: 1, actionTitle: '차량 진입 및 리프트 암 체결', safetyControlPoint: '차량 중심점을 맞춰 4개 지지 포인트를 완벽히 고정', potentialHazard: '차량 편하중으로 인한 전복' },
      { stepNumber: 2, actionTitle: '1차 50cm 상승 후 흔들림 점검', safetyControlPoint: '손으로 차체를 흔들어 결착 상태 최종 확인', potentialHazard: '상승 중 이탈' },
      { stepNumber: 3, actionTitle: '목표 높이 상승 및 기계식 락 체결', safetyControlPoint: '유압 밸브 잠금 및 래칫 안전 걸쇠 걸림음 확인', potentialHazard: '유압 실린더 파손 시 급격한 낙하' },
      { stepNumber: 4, actionTitle: '하부 부품 탈거 및 정비 작업', safetyControlPoint: '반드시 보안경 착용 및 2인 1조 작업 수행', potentialHazard: '오일 비산 및 부품 낙하' },
    ],
    prohibitedActions: [
      '안전 걸쇠(락) 미체결 상태에서 차량 하부 진입 금지',
      '리프트 가동 중 타 작업자 출입 금지',
      '차량 정격 하중(3.5톤) 초과 차량 인양 금지',
    ],
    authorName: '김정비 책임안전관리자',
    revisedDate: '2026-03-01',
  },
  {
    sopId: 'sop-2',
    processName: '목공실 테이블쏘(원형톱) 부재 재단 작업',
    department: '목공/공방팀',
    requiredPPE: ['보안경', '방진마스크', '귀마개 (방음)'],
    standardSteps: [
      { stepNumber: 1, actionTitle: '작업 전 집진기 가동 및 날 점검', safetyControlPoint: '톱날 균열 여부 및 안전 덮개 정상 작동 확인', potentialHazard: '톱날 파손 파편 비산' },
      { stepNumber: 2, actionTitle: '조기대 간격 세팅 및 잠금', safetyControlPoint: '재단 치수 확인 후 레버 확실히 고정', potentialHazard: '조기대 밀림으로 인한 킥백' },
      { stepNumber: 3, actionTitle: '푸시 스틱(밀대)을 사용한 자재 밀기', safetyControlPoint: '톱날 10cm 이내에는 절대 손을 대지 않고 밀대 사용', potentialHazard: '원형톱날 손가락 접촉 절단' },
    ],
    prohibitedActions: [
      '장갑(목장갑, 면장갑) 착용 절대 금지 (말림 위험)',
      '안전 덮개 탈거 상태에서 작업 금지',
    ],
    authorName: '이공방 목공마스터',
    revisedDate: '2026-03-10',
  },
];

const INITIAL_HAZARDS: HazardRiskItem[] = [
  {
    hazardId: 'h-1',
    sopId: 'sop-1',
    processName: '차량 리프트 하부 정비 작업',
    hazardCategory: 'mechanical',
    hazardDescription: '리프트 유압 호스 노후화 파손으로 인한 급격한 차량 낙하',
    currentFrequency: 4,
    currentSeverity: 5,
    currentRiskScore: 20,
    currentRiskLevel: 'critical',
    controlMeasure: '기계식 이중 안전 멈춤 쇄 시공 및 일일 유압 밸브 점검표 작성',
    controlType: 'engineering',
    residualFrequency: 1,
    residualSeverity: 4,
    residualRiskScore: 4,
    residualRiskLevel: 'low',
    isImplemented: true,
    actionDeadline: '2026-10-31',
    inspectorName: '김정비 안전관리자',
  },
  {
    hazardId: 'h-2',
    sopId: 'sop-2',
    processName: '목공실 테이블쏘 부재 재단 작업',
    hazardCategory: 'mechanical',
    hazardDescription: '원형톱 고속 회전 중 킥백(자재 튕김)으로 인한 작업자 흉부 충격',
    currentFrequency: 3,
    currentSeverity: 4,
    currentRiskScore: 12,
    currentRiskLevel: 'high',
    controlMeasure: '분할날(Riving Knife) 설치 및 푸시 스틱 100% 사용 의무화',
    controlType: 'engineering',
    residualFrequency: 1,
    residualSeverity: 3,
    residualRiskScore: 3,
    residualRiskLevel: 'low',
    isImplemented: true,
    actionDeadline: '2026-10-25',
    inspectorName: '이공방 안전담당',
  },
  {
    hazardId: 'h-3',
    processName: '수영장 기계실 약품 배합',
    hazardCategory: 'chemical',
    hazardDescription: '차아염소산나트륨 용액 배합 중 원액 피부 접촉 및 가스 흡입',
    currentFrequency: 3,
    currentSeverity: 4,
    currentRiskScore: 12,
    currentRiskLevel: 'high',
    controlMeasure: '송기 마스크 및 내화학성 앞치마/고글 착용, 강제 배기 설비 가동',
    controlType: 'ppe',
    residualFrequency: 1,
    residualSeverity: 2,
    residualRiskScore: 2,
    residualRiskLevel: 'low',
    isImplemented: false,
    actionDeadline: '2026-10-30',
    inspectorName: '박수영 시설과장',
  },
];

export const SopRiskAssessmentView: React.FC = () => {
  const [sops] = useState<WorkStandardSOP[]>(INITIAL_SOPS);
  const [selectedSop, setSelectedSop] = useState<WorkStandardSOP>(INITIAL_SOPS[0]);
  const [hazards, setHazards] = useState<HazardRiskItem[]>(INITIAL_HAZARDS);
  const [activeTab, setActiveTab] = useState<'sop' | 'matrix' | 'controls'>('sop');

  // 신규 위험요인 입력 폼 상태
  const [newProcess, setNewProcess] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newFreq, setNewFreq] = useState<number>(3);
  const [newSev, setNewSev] = useState<number>(3);
  const [newControl, setNewControl] = useState('');

  const handleAddHazard = () => {
    if (!newProcess.trim() || !newDesc.trim()) return;

    const calc = calculateRiskLevel(newFreq, newSev);
    const residualFreq = 1;
    const residualSev = Math.max(1, newSev - 1);
    const residualCalc = calculateRiskLevel(residualFreq, residualSev);

    const newItem: HazardRiskItem = {
      hazardId: `h-${Date.now()}`,
      processName: newProcess.trim(),
      hazardCategory: 'mechanical',
      hazardDescription: newDesc.trim(),
      currentFrequency: newFreq,
      currentSeverity: newSev,
      currentRiskScore: calc.score,
      currentRiskLevel: calc.level,
      controlMeasure: newControl.trim() || '안전 작업 지침 수립 및 보호구 착용',
      controlType: 'administrative',
      residualFrequency: residualFreq,
      residualSeverity: residualSev,
      residualRiskScore: residualCalc.score,
      residualRiskLevel: residualCalc.level,
      isImplemented: false,
      actionDeadline: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      inspectorName: '현장 관리자',
    };

    setHazards([newItem, ...hazards]);
    setNewProcess('');
    setNewDesc('');
    setNewControl('');
  };

  const handleToggleImplement = (id: string) => {
    setHazards(prev =>
      prev.map(h =>
        h.hazardId === id ? { ...h, isImplemented: !h.isImplemented } : h
      )
    );
  };

  const auditSummary = calculateSafetyAuditSummary(hazards);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 6px 0', color: '#111827' }}>
            🛡️ 작업표준(SOP) 및 위험성평가 관리
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            산업안전보건법 제36조 기준 공정별 안전작업표준, 5×5 빈도·강도 위험성평가 및 개선대책 이행을 통합 관리합니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('sop')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: activeTab === 'sop' ? '#dc2626' : '#ffffff',
              color: activeTab === 'sop' ? '#ffffff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            안전작업표준 (SOP) ({sops.length})
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: activeTab === 'matrix' ? '#dc2626' : '#ffffff',
              color: activeTab === 'matrix' ? '#ffffff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            5×5 위험성평가표 ({hazards.length})
          </button>
          <button
            onClick={() => setActiveTab('controls')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: activeTab === 'controls' ? '#dc2626' : '#ffffff',
              color: activeTab === 'controls' ? '#ffffff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            개선대책 이행률 ({auditSummary.complianceRatePercent}%)
          </button>
        </div>
      </div>

      {/* 종합 안전 감사 지표 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>법정 점검 적합성</div>
          <div style={{
            fontSize: '22px',
            fontWeight: 700,
            color: auditSummary.isLegalAuditReady ? '#10b981' : '#dc2626',
          }}>
            {auditSummary.isLegalAuditReady ? '✅ 적합 (Audit Ready)' : '⚠️ 개선 미완료'}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            중대위험 100% 해소 & 이행률 80% 이상
          </div>
        </div>

        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>중대·고위험 요인</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: auditSummary.criticalHazards > 0 ? '#dc2626' : '#111827' }}>
            {auditSummary.criticalHazards} 건 (중대) / {auditSummary.highHazards} 건 (높음)
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            위험 점수 15점 이상 즉시 작업 중지
          </div>
        </div>

        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>개선대책 조치 완료</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#2563eb' }}>
            {auditSummary.implementedCount} / {auditSummary.totalHazards} 건
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            미이행 {auditSummary.pendingCount}건 진행 중
          </div>
        </div>

        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>공정 안전 표준 (SOP)</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
            {sops.length} 개 공정
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            전 작업자 안전수칙 숙지 및 서명 관리
          </div>
        </div>
      </div>

      {activeTab === 'sop' ? (
        /* 탭 1: 안전작업표준 (SOP) 상세 */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          {/* 공정 선택 목록 */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#111827' }}>
              📋 표준 공정 매뉴얼 목록
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sops.map(s => (
                <div
                  key={s.sopId}
                  onClick={() => setSelectedSop(s)}
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    border: selectedSop.sopId === s.sopId ? '2px solid #dc2626' : '1px solid #e5e7eb',
                    background: selectedSop.sopId === s.sopId ? '#fef2f2' : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', marginBottom: '4px' }}>
                    {s.processName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {s.department} • 개정일: {s.revisedDate}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 선택된 SOP 상세 정보 */}
          <div style={{ background: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 700 }}>STANDARD OPERATING PROCEDURE</span>
              <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0 8px 0', color: '#111827' }}>
                {selectedSop.processName}
              </h3>
              <div style={{ fontSize: '13px', color: '#4b5563' }}>
                작성/검토자: <strong>{selectedSop.authorName}</strong> | 부서: {selectedSop.department}
              </div>
            </div>

            {/* 필수 보호구 (PPE) */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                🦺 필수 착용 개인보호구 (PPE)
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {selectedSop.requiredPPE.map((ppe, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '16px',
                      background: '#fee2e2',
                      color: '#991b1b',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    ✓ {ppe}
                  </span>
                ))}
              </div>
            </div>

            {/* 단계별 표준 절차 */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>
                ⚙️ 표준 작업 순서 및 안전 통제점
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedSop.standardSteps.map(step => (
                  <div
                    key={step.stepNumber}
                    style={{
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '6px',
                      borderLeft: '4px solid #dc2626',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#111827', marginBottom: '4px' }}>
                      STEP {step.stepNumber}. {step.actionTitle}
                    </div>
                    <div style={{ fontSize: '12px', color: '#166534', marginBottom: '2px' }}>
                      <strong>안전 핵심:</strong> {step.safetyControlPoint}
                    </div>
                    {step.potentialHazard && (
                      <div style={{ fontSize: '11px', color: '#b91c1c' }}>
                        ⚠️ 잠재 위험: {step.potentialHazard}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 절대 금지 사항 */}
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '14px', borderRadius: '6px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#be123c', marginBottom: '6px' }}>
                🚫 절대 금지 행위 (위반 시 작업 퇴장)
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#9f1239' }}>
                {selectedSop.prohibitedActions.map((act, idx) => (
                  <li key={idx} style={{ marginBottom: '2px' }}>{act}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : activeTab === 'matrix' ? (
        /* 탭 2: 5x5 위험성평가 매트릭스 등록 */
        <div>
          {/* 신규 위험요인 등록 박스 */}
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '18px', borderRadius: '8px', marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#991b1b' }}>
              ➕ 유해·위험요인 발굴 및 5×5 평가 등록
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 100px 100px', gap: '12px', marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="대상 공정/작업명"
                value={newProcess}
                onChange={e => setNewProcess(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px' }}
              />
              <input
                type="text"
                placeholder="유해·위험요인 (상황 및 재해 유형)"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px' }}
              />
              <div>
                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block' }}>빈도 (1~5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={newFreq}
                  onChange={e => setNewFreq(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block' }}>강도 (1~5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={newSev}
                  onChange={e => setNewSev(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="위험 감소 대책 (공학적 방호장치 / 작업절차 개선 / 보호구)"
                value={newControl}
                onChange={e => setNewControl(e.target.value)}
                style={{ flex: 1, padding: '8px 10px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px' }}
              />
              <button
                onClick={handleAddHazard}
                style={{
                  padding: '8px 20px',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                + 위험요인 평가 등록
              </button>
            </div>
          </div>

          {/* 등록된 위험요인 5x5 평가표 */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>공정명</th>
                <th style={{ padding: '10px' }}>유해·위험요인</th>
                <th style={{ padding: '10px' }}>빈도×강도</th>
                <th style={{ padding: '10px' }}>위험 점수</th>
                <th style={{ padding: '10px' }}>위험 등급</th>
                <th style={{ padding: '10px' }}>개선 대책</th>
                <th style={{ padding: '10px' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {hazards.map(h => (
                <tr key={h.hazardId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 10px', fontWeight: 600 }}>{h.processName}</td>
                  <td style={{ padding: '12px 10px', color: '#374151' }}>{h.hazardDescription}</td>
                  <td style={{ padding: '12px 10px', color: '#6b7280' }}>{h.currentFrequency} × {h.currentSeverity}</td>
                  <td style={{ padding: '12px 10px', fontWeight: 700, color: h.currentRiskScore >= 15 ? '#dc2626' : '#111827' }}>
                    {h.currentRiskScore} 점
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background:
                          h.currentRiskLevel === 'critical'
                            ? '#fee2e2'
                            : h.currentRiskLevel === 'high'
                            ? '#ffedd5'
                            : '#fef9c3',
                        color:
                          h.currentRiskLevel === 'critical'
                            ? '#991b1b'
                            : h.currentRiskLevel === 'high'
                            ? '#c2410c'
                            : '#854d0e',
                      }}
                    >
                      {h.currentRiskLevel.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px', color: '#4b5563' }}>{h.controlMeasure}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: h.isImplemented ? '#dcfce7' : '#fee2e2',
                        color: h.isImplemented ? '#166534' : '#991b1b',
                      }}
                    >
                      {h.isImplemented ? '조치 완료' : '미조치 (진행중)'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* 탭 3: 개선대책 이행 점검 및 잔여 위험도 재평가 */
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#111827' }}>
            🛠️ 위험 감소 개선대책 이행 및 잔여위험도 재평가
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {hazards.map(h => (
              <div
                key={h.hazardId}
                style={{
                  padding: '16px',
                  borderRadius: '6px',
                  border: h.isImplemented ? '1px solid #86efac' : '1px solid #fecaca',
                  background: h.isImplemented ? '#f0fdf4' : '#fff5f5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>
                      {h.processName}
                    </span>
                    <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                      [개선전: {h.currentRiskScore}점({h.currentRiskLevel})]
                    </span>
                    <span>➔</span>
                    <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                      [개선후: {h.residualRiskScore}점({h.residualRiskLevel})]
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
                    <strong>수립 대책:</strong> {h.controlMeasure}
                  </div>

                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    이행 기한: {h.actionDeadline} | 담당 점검자: {h.inspectorName}
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => handleToggleImplement(h.hazardId)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      background: h.isImplemented ? '#16a34a' : '#dc2626',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {h.isImplemented ? '✓ 조치 완료됨' : '조치 완료 처리'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
