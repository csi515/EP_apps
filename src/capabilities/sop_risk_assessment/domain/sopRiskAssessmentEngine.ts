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
  | 'hygiene_health' // 소음, 분진, 온열질환
  // ISO 14001 환경측면평가 (Environmental Aspects)
  | 'env_waste' // 산업폐기물·지정폐기물
  | 'env_energy' // 에너지·온실가스 과소비
  | 'env_emission' // 대기오염·수질오염 배출
  | 'env_leakage'; // 화학물질 누출·토양오염

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

export interface EnvironmentalAspectDetail {
  aspectCategory: 'waste' | 'energy' | 'emission' | 'leakage';
  environmentalImpact: string; // 예: "하천 수질 오염", "폐유 배출", "대기 중 VOC 배출"
  legalRequirement: string; // 관련 환경 법규 (예: 물환경보전법, 대기환경보전법, 폐기물관리법)
  isSignificantAspect: boolean; // 중대한 환경측면 여부
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

  // 위험성 감소 대책 (ISO 45001 위험요인 제거 4단계 계층)
  controlMeasure: string;
  controlType: 'elimination' | 'engineering' | 'administrative' | 'ppe'; // 본질적 제거/대체 | 공학적 | 관리적 | 보호구

  // 잔여 위험도 (개선 후)
  residualFrequency: number;
  residualSeverity: number;
  residualRiskScore: number;
  residualRiskLevel: RiskLevel;

  isImplemented: boolean;
  actionDeadline: string;
  inspectorName: string;
  environmentalAspect?: EnvironmentalAspectDetail;
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

/**
 * ISO 14001:2015 6.1.2항 환경측면(Environmental Aspects) 평가 결과 산출
 */
export function evaluateEnvironmentalAspect(input: {
  aspectCategory: 'waste' | 'energy' | 'emission' | 'leakage';
  frequency: number; // 발생 빈도 (1 ~ 5)
  severity: number; // 환경 영향 심각성 (1 ~ 5)
  legalRegulated: boolean; // 법적 규제 대상 여부
}): {
  score: number;
  isSignificantAspect: boolean; // 중대한 환경측면 여부
  managementRequirement: string;
} {
  const score = input.frequency * input.severity;
  // 법적 규제 대상이거나 빈도x심각성 점수가 12점 이상인 경우 중대한 환경측면(Significant Aspect)으로 판정
  const isSignificantAspect = input.legalRegulated || score >= 12;
  const managementRequirement = isSignificantAspect
    ? '중대 환경측면: 환경목표(EMP) 수립 및 중점 관리 지침 수립 필수'
    : '일반 환경측면: 일상 운영 관리 기준 준수 및 모니터링';

  return {
    score,
    isSignificantAspect,
    managementRequirement,
  };
}

/**
 * 연구실안전환경조성에 관한 법률(연구실안전법) 제9조/제18조 대응 도메인
 */
export interface LabSafetyDailyInspection {
  id: string;
  labName: string; // 예: "제1합성연구실", "정밀분석기기실"
  inspectionDate: string; // YYYY-MM-DD
  inspectorName: string;
  emergencyShowerWorking: boolean; // 비상 샤워기/세안기 통수 정상 여부
  gasDetectorWorking: boolean; // 가스 누출 감지 경보기 정상 작동
  fireExtinguisherValid: boolean; // 소화기 압력 게이지 정상 및 비치
  fumeHoodVelocityOk: boolean; // 흄후드(배기설비) 제어풍속 정상 (0.4 m/s 이상)
  chemicalStorageOrganized: boolean; // 시약 성상별(산/염기/유기) 분리보관
  isAllPassed: boolean;
  correctiveActions: string[];
}

export interface LabChemicalReagentMsds {
  id: string;
  reagentName: string; // 예: 아세톤, 황산, 메탄올
  casNumber: string; // 예: 67-64-1
  hazardClassification: string; // 예: 인화성 액체 구분2
  storageLocation: string; // 예: 1연구실 내화 방폭 시약장 A-01
  msdsAvailable: boolean; // MSDS 경고표지 및 서류 비치 여부
  currentStock: number;
  unit: string;
}

export interface LabSafetyTrainingRecord {
  researcherId: string;
  researcherName: string;
  department: string;
  halfYearPeriod: string; // 예: "2026-H2"
  requiredHours: number; // 법정 의무 6시간
  completedHours: number;
  isFullyCompliant: boolean;
}

/**
 * 연구실 일일 안전점검 결과를 판정하고 결함 시 시정조치 목록을 생성합니다.
 */
export function evaluateLabSafetyInspection(input: Omit<LabSafetyDailyInspection, 'id' | 'isAllPassed' | 'correctiveActions'>): LabSafetyDailyInspection {
  const correctiveActions: string[] = [];

  if (!input.emergencyShowerWorking) {
    correctiveActions.push('비상 샤워기/세안기 급수 밸브 점검 및 배관 세척 조치 필요');
  }
  if (!input.gasDetectorWorking) {
    correctiveActions.push('가스 감지기 센서 영점 교정 및 경보기 회로 긴급 수리 요망');
  }
  if (!input.fireExtinguisherValid) {
    correctiveActions.push('소화기 압력 저하 확인: 소화기 즉시 교체 및 통로 장애물 제거');
  }
  if (!input.fumeHoodVelocityOk) {
    correctiveActions.push('흄후드 배기 모터 및 필터 점검 요망 (기준 제어풍속 0.4 m/s 미달)');
  }
  if (!input.chemicalStorageOrganized) {
    correctiveActions.push('화학 시약 산/염기 혼합 보관 금지: 성상별 분리 보관 및 밀폐 조치');
  }

  const isAllPassed = correctiveActions.length === 0;

  return {
    ...input,
    id: `lab-insp-${Date.now()}`,
    isAllPassed,
    correctiveActions,
  };
}

/**
 * 연구실 연구원 법정 안전교육(반기 6시간) 이수율을 계산합니다.
 */
export function calculateLabSafetyTrainingCompliance(records: LabSafetyTrainingRecord[]): {
  totalResearchers: number;
  compliantCount: number;
  nonCompliantCount: number;
  overallComplianceRatePercent: number;
  isFullyLegalCompliant: boolean;
} {
  if (records.length === 0) {
    return {
      totalResearchers: 0,
      compliantCount: 0,
      nonCompliantCount: 0,
      overallComplianceRatePercent: 100,
      isFullyLegalCompliant: true,
    };
  }

  const compliantCount = records.filter((r) => r.completedHours >= r.requiredHours).length;
  const nonCompliantCount = records.length - compliantCount;
  const overallComplianceRatePercent = Number(((compliantCount / records.length) * 100).toFixed(1));

  return {
    totalResearchers: records.length,
    compliantCount,
    nonCompliantCount,
    overallComplianceRatePercent,
    isFullyLegalCompliant: nonCompliantCount === 0,
  };
}

