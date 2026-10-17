/**
 * facility_incident_report 도메인 비즈니스 엔진
 * 안전사고·기물파손 경위서 & 배상책임보험 청구 대장
 */

export type IncidentType = 'injury' | 'property_damage' | 'conflict' | 'pet_incident' | 'equipment_failure' | 'other';
export type IncidentSeverity = 'minor' | 'moderate' | 'severe' | 'critical';
export type IncidentStatus = 'open' | 'investigating' | 'insurance_processing' | 'resolved';

export interface IncidentReportItem {
  id: string;
  organizationId: string;
  incidentTitle: string;
  incidentDate: string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  locationInFacility: string;
  involvedPersonName: string;
  involvedPersonRole: string;
  witnessName?: string | null;
  supervisorName?: string | null;
  description: string;
  injuryDetails?: string | null;
  emergencyActionTaken?: string | null;
  guardianNotifiedAt?: string | null;
  hospitalTransported: boolean;
  insuranceClaimed: boolean;
  insuranceClaimNumber?: string | null;
  preventativeAction?: string | null;
  status: IncidentStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentTimelineItem {
  id: string;
  incidentId: string;
  recordedAt: string;
  actionType: string;
  actorName: string;
  note: string;
}

/**
 * 부상 정도 및 병원 이송 여부에 따른 사고 심각도 자동 판정
 */
export function evaluateIncidentSeverity(input: {
  hospitalTransported: boolean;
  hasFractureOrBleeding?: boolean;
  propertyDamageAmount?: number;
}): IncidentSeverity {
  if (input.hospitalTransported) {
    return 'severe';
  }
  if (input.hasFractureOrBleeding) {
    return 'moderate';
  }
  if (input.propertyDamageAmount && input.propertyDamageAmount >= 1000000) {
    return 'severe';
  }
  if (input.propertyDamageAmount && input.propertyDamageAmount >= 300000) {
    return 'moderate';
  }
  return 'minor';
}

/**
 * 사고 상태 전이 검증
 */
export function transitionIncidentStatus(
  currentStatus: IncidentStatus,
  targetStatus: IncidentStatus,
  options?: { insuranceClaimNumber?: string; preventativeAction?: string }
): { valid: boolean; reason?: string } {
  const allowedTransitions: Record<IncidentStatus, IncidentStatus[]> = {
    open: ['investigating', 'resolved'],
    investigating: ['insurance_processing', 'resolved', 'open'],
    insurance_processing: ['resolved', 'investigating'],
    resolved: ['open', 'investigating'],
  };

  if (!allowedTransitions[currentStatus]?.includes(targetStatus)) {
    return {
      valid: false,
      reason: `현재 '${currentStatus}' 상태에서는 '${targetStatus}'(으)로 직접 전이할 수 없습니다.`,
    };
  }

  if (targetStatus === 'insurance_processing' && !options?.insuranceClaimNumber) {
    return {
      valid: false,
      reason: '보험 처리 상태로 변경하려면 보험 접수 번호가 필요합니다.',
    };
  }

  if (targetStatus === 'resolved' && !options?.preventativeAction) {
    return {
      valid: false,
      reason: '사고 종결 처리 시 재발 방지 대책이 필수로 기록되어야 합니다.',
    };
  }

  return { valid: true };
}

/**
 * 0원 W3C SVG 표준 사고경위서/확인증 그래픽 생성
 */
export function renderIncidentReportSvg(report: IncidentReportItem): string {
  const safeTitle = (report.incidentTitle || '시설 안전사고 경위서')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safePerson = (report.involvedPersonName || '미상')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safeLocation = (report.locationInFacility || '원내')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safeDate = report.incidentDate.slice(0, 10);
  const severityColor =
    report.severity === 'critical'
      ? '#dc2626'
      : report.severity === 'severe'
      ? '#ea580c'
      : report.severity === 'moderate'
      ? '#d97706'
      : '#2563eb';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 280" width="100%" height="100%">
  <rect width="500" height="280" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="0" y="0" width="500" height="50" rx="16" fill="#1e293b"/>
  <rect x="0" y="30" width="500" height="20" fill="#1e293b"/>
  <text x="24" y="32" fill="#ffffff" font-size="16" font-weight="bold" font-family="sans-serif">🚨 시설 안전사고 및 파손 경위서</text>
  <rect x="400" y="14" width="76" height="24" rx="12" fill="${severityColor}"/>
  <text x="438" y="30" fill="#ffffff" font-size="11" font-weight="bold" text-anchor="middle" font-family="sans-serif">${report.severity.toUpperCase()}</text>
  
  <text x="24" y="85" fill="#64748b" font-size="12" font-family="sans-serif">사고명</text>
  <text x="24" y="105" fill="#0f172a" font-size="15" font-weight="bold" font-family="sans-serif">${safeTitle}</text>
  
  <text x="24" y="145" fill="#64748b" font-size="12" font-family="sans-serif">발생일시</text>
  <text x="24" y="165" fill="#334155" font-size="13" font-family="sans-serif">${safeDate}</text>
  
  <text x="180" y="145" fill="#64748b" font-size="12" font-family="sans-serif">발생장소</text>
  <text x="180" y="165" fill="#334155" font-size="13" font-family="sans-serif">${safeLocation}</text>

  <text x="330" y="145" fill="#64748b" font-size="12" font-family="sans-serif">당사자</text>
  <text x="330" y="165" fill="#334155" font-size="13" font-weight="bold" font-family="sans-serif">${safePerson} (${report.involvedPersonRole})</text>
  
  <line x1="24" y1="190" x2="476" y2="190" stroke="#f1f5f9" stroke-width="1.5"/>
  
  <text x="24" y="220" fill="#64748b" font-size="12" font-family="sans-serif">상태: <tspan fill="#0284c7" font-weight="bold">${report.status.toUpperCase()}</tspan></text>
  <text x="180" y="220" fill="#64748b" font-size="12" font-family="sans-serif">병원후송: ${report.hospitalTransported ? '🚑 완료' : '없음'}</text>
  <text x="330" y="220" fill="#64748b" font-size="12" font-family="sans-serif">보험청구: ${report.insuranceClaimed ? '📄 ' + (report.insuranceClaimNumber || '접수됨') : '미청구'}</text>

  <text x="250" y="260" fill="#94a3b8" font-size="11" text-anchor="middle" font-family="sans-serif">Moa Safety Trust System • 전자 사고 기록부</text>
</svg>`;
}

/**
 * 0원 보호자 유선 안내 및 알림톡/SMS 텍스트 템플릿
 */
export function formatIncidentNotificationText(report: IncidentReportItem): string {
  const hospitalText = report.hospitalTransported ? '병원 후송 및 진료가 진행되었습니다.' : '원내에서 즉시 응급처치를 완료하였습니다.';
  return `[시설 안전사고 경위 및 안내]
안녕하세요. 원내에서 발생한 상황을 신속하고 투명하게 안내드립니다.

- 일시: ${report.incidentDate.slice(0, 16).replace('T', ' ')}
- 장소: ${report.locationInFacility}
- 대상: ${report.involvedPersonName} (${report.involvedPersonRole})
- 상황: ${report.incidentTitle}
- 세부내용: ${report.description}
- 현장조치: ${report.emergencyActionTaken || hospitalText}

원생/고객의 빠른 안정과 회복을 최우선으로 돌보고 있으며, 추가 문의사항은 언제든 원으로 연락 주시기 바랍니다.`;
}
