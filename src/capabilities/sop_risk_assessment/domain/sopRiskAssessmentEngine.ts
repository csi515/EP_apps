/**
 * 사업장 작업표준(SOP) 및 위험성평가(Risk Assessment) 순수 도메인 엔진
 *
 * 산업안전보건법 제36조 및 중대재해처벌법 대비:
 * 1. 공정별 안전작업표준 (SOP: Standard Operating Procedure)
 * 2. 5x5 빈도·강도 위험성평가 매트릭스 (Hazard Risk Matrix)
 * 3. 유해·위험요인 발굴 -> 개선대책(공학/관리/보호구) 수립 -> 잔여 위험도 재평가
 * 4. 사업장 안전보건 이행률(Compliance Rate) 종합 감사 지표
 */

export type HazardCategory =
  | 'mechanical' // 끼임, 감김, 절단
  | 'fall' // 추락, 넘어짐, 미끄러짐
  | 'electrical' // 감전, 누전
  | 'chemical' // 유해물질, 흡입, 화상
  | 'fire_explosion' // 화재, 폭발
  | 'ergonomic' // 근골격계, 중량물 운반
  | 'hygiene_health'; // 소음, 분진, 온열질환

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SOPStep {
  stepNumber: number;
  actionTitle: string;
  safetyControlPoint: string;
  potentialHazard?: string;
}

export interface WorkStandardSOP {
  sopId: string;
  processName: string; // 예: "차량 하부 리프트 정비 작업", "주방 대형 육류 절단기 사용"
  department: string;
  requiredPPE: string[]; // 필수 보호구: ['안전모', '보안경', '절단방지장갑', '안전화']
  standardSteps: SOPStep[];
  prohibitedActions: string[]; // 절대 금지 행위
  authorName: string;
  revisedDate: string;
}

export interface HazardRiskItem {
  hazardId: string;
  sopId?: string;
  processName: string;
  hazardCategory: HazardCategory;
  hazardDescription: string; // 구체적 위험 상황

  // 현재 위험도 (개선 전)
  currentFrequency: number; // 발생 빈도 (1 ~ 5)
  currentSeverity: number; // 피해 강도 (1 ~ 5)
  currentRiskScore: number; // 빈도 x 강도 (1 ~ 25)
  currentRiskLevel: RiskLevel;

  // 위험성 감소 대책
  controlMeasure: string;
  controlType: 'engineering' | 'administrative' | 'ppe'; // 공학적 / 관리적 / 보호구

  // 잔여 위험도 (개선 후)
  residualFrequency: number;
  residualSeverity: number;
  residualRiskScore: number;
  residualRiskLevel: RiskLevel;

  isImplemented: boolean;
  actionDeadline: string;
  inspectorName: string;
}

export interface RiskMatrixCell {
  frequency: number;
  severity: number;
  score: number;
  level: RiskLevel;
  actionGuide: string;
}

export interface WorkplaceSafetyAuditSummary {
  totalHazards: number;
  criticalHazards: number;
  highHazards: number;
  mediumHazards: number;
  lowHazards: number;
  implementedCount: number;
  pendingCount: number;
  complianceRatePercent: number; // 0 ~ 100%
  isLegalAuditReady: boolean; // 법정 점검 기준 적합 여부
}

/**
 * 위험도(Risk Score) 및 등급 판정
 * 1 ~ 4: low (경미한 위험, 기존 보호조치 유지)
 * 5 ~ 9: medium (보통 위험, 개선 계획 수립)
 * 10 ~ 14: high (높은 위험, 조속한 개선 조치 필수)
 * 15 ~ 25: critical (중대 위험, 작업 중지 또는 즉시 시정 조치)
 */
export function calculateRiskLevel(frequency: number, severity: number): {
  score: number;
  level: RiskLevel;
  actionGuide: string;
  requiresImmediateAction: boolean;
} {
  const clampedFreq = Math.max(1, Math.min(5, Math.round(frequency)));
  const clampedSev = Math.max(1, Math.min(5, Math.round(severity)));
  const score = clampedFreq * clampedSev;

  let level: RiskLevel = 'low';
  let actionGuide = '기존 안전 수칙 유지 및 주기적 관찰';
  let requiresImmediateAction = false;

  if (score >= 15) {
    level = 'critical';
    actionGuide = '작업 즉시 중지 및 근본적 공학적 방호장치 시공 전까지 작업 불허';
    requiresImmediateAction = true;
  } else if (score >= 10) {
    level = 'high';
    actionGuide = '조속한 시일 내 개선 계획 수립 및 특별 안전교육 실시';
    requiresImmediateAction = true;
  } else if (score >= 5) {
    level = 'medium';
    actionGuide = '관리적 개선 대책 수립 및 정기 점검 시 이행 점검';
  }

  return {
    score,
    level,
    actionGuide,
    requiresImmediateAction,
  };
}

/**
 * 대책 수립 후 위험도 감소율(%) 및 허용 가능 여부 판정
 * 허용 가능 기준: 잔여 위험도가 low(4점 이하) 또는 medium(9점 이하)으로 감소
 */
export function evaluateRiskReduction(
  currentScore: number,
  residualScore: number
): { reductionPercent: number; isAcceptable: boolean } {
  if (currentScore <= 0) return { reductionPercent: 0, isAcceptable: true };

  const reduction = Math.max(0, currentScore - residualScore);
  const reductionPercent = Math.round((reduction / currentScore) * 100);
  const isAcceptable = residualScore <= 9; // 보통 위험 이하로 떨어졌는지

  return {
    reductionPercent,
    isAcceptable,
  };
}

/**
 * 사업장 전체 위험성평가 종합 감사 지표 및 법정 적합성 산출
 */
export function calculateSafetyAuditSummary(
  hazards: HazardRiskItem[]
): WorkplaceSafetyAuditSummary {
  if (hazards.length === 0) {
    return {
      totalHazards: 0,
      criticalHazards: 0,
      highHazards: 0,
      mediumHazards: 0,
      lowHazards: 0,
      implementedCount: 0,
      pendingCount: 0,
      complianceRatePercent: 100,
      isLegalAuditReady: true,
    };
  }

  let criticalHazards = 0;
  let highHazards = 0;
  let mediumHazards = 0;
  let lowHazards = 0;
  let implementedCount = 0;

  for (const h of hazards) {
    if (h.currentRiskLevel === 'critical') criticalHazards++;
    else if (h.currentRiskLevel === 'high') highHazards++;
    else if (h.currentRiskLevel === 'medium') mediumHazards++;
    else lowHazards++;

    if (h.isImplemented) {
      implementedCount++;
    }
  }

  const pendingCount = hazards.length - implementedCount;
  const complianceRatePercent = Math.round((implementedCount / hazards.length) * 100);

  // 법정 점검 적합 기준:
  // 1. 중대 위험(critical) 항목은 반드시 100% 개선 조치 완료
  // 2. 전체 대책 이행률 80% 이상
  const unaddressedCritical = hazards.some(
    (h) => h.currentRiskLevel === 'critical' && !h.isImplemented
  );
  const isLegalAuditReady = !unaddressedCritical && complianceRatePercent >= 80;

  return {
    totalHazards: hazards.length,
    criticalHazards,
    highHazards,
    mediumHazards,
    lowHazards,
    implementedCount,
    pendingCount,
    complianceRatePercent,
    isLegalAuditReady,
  };
}
