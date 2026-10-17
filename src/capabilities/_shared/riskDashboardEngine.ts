/**
 * 전사 통합 위험 지수(Executive Risk Index) 산출 엔진 (Pure Domain Function)
 * 
 * 4대 부서별 리스크 팩터 결합:
 * 1. 안전/시설 사고 (facility_incident_report): 오픈된 미해결 사고 건수 및 심각도 가중치
 * 2. 고객 VOC 불만 (feedbacks): 불만 제기 및 조치 미완료 VOC 건수
 * 3. 고객 만족도 (nps_survey_collector): NPS 비추천자(Detractor) 비율
 * 4. 재무/수납 (billing_invoicing): 미수금 및 연체 청구 건수 비율
 */

export type RiskLevelGrade = 'normal' | 'caution' | 'warning' | 'critical';

export interface DepartmentRiskFactors {
  incidentCount: number; // 미해결 안전/시설사고 건수
  criticalIncidentCount: number; // 중대재해/파손 사고 건수
  vocComplaintCount: number; // 미처리 고객 불만 VOC 건수
  npsDetractorRatio: number; // NPS 비추천자 비율 (0.0 ~ 1.0)
  unpaidInvoiceCount: number; // 미수금/연체 청구 건수
  overdueInvoiceRatio: number; // 전체 청구 대비 연체율 (0.0 ~ 1.0)
}

export interface ExecutiveRiskAssessment {
  riskScore: number; // 0 ~ 100점 (높을수록 위험)
  grade: RiskLevelGrade;
  breakdown: {
    safetyScore: number; // 최대 30점
    customerScore: number; // 최대 30점
    financialScore: number; // 최대 40점
  };
  keyActionItems: string[];
}

/**
 * 전사 종합 위험 점수 산출
 */
export function calculateExecutiveRiskScore(factors: DepartmentRiskFactors): ExecutiveRiskAssessment {
  // 1. 안전 리스크 (최대 30점)
  // 일반 사고 1건당 5점, 중대 사고 1건당 15점
  const rawSafety = factors.incidentCount * 5 + factors.criticalIncidentCount * 15;
  const safetyScore = Math.min(30, rawSafety);

  // 2. 고객 VOC & NPS 리스크 (최대 30점)
  // VOC 불만 1건당 4점 (최대 15점) + NPS 비추천 비율 (최대 15점)
  const vocComponent = Math.min(15, factors.vocComplaintCount * 4);
  const npsComponent = Math.min(15, Math.round(factors.npsDetractorRatio * 15));
  const customerScore = vocComponent + npsComponent;

  // 3. 재무 수납 리스크 (최대 40점)
  // 미납 건수 1건당 4점 (최대 20점) + 연체율 (최대 20점)
  const unpaidComponent = Math.min(20, factors.unpaidInvoiceCount * 4);
  const overdueComponent = Math.min(20, Math.round(factors.overdueInvoiceRatio * 20));
  const financialScore = unpaidComponent + overdueComponent;

  const totalScore = safetyScore + customerScore + financialScore;

  let grade: RiskLevelGrade = 'normal';
  if (totalScore >= 75 || factors.criticalIncidentCount > 0) {
    grade = 'critical';
  } else if (totalScore >= 50) {
    grade = 'warning';
  } else if (totalScore >= 25) {
    grade = 'caution';
  }

  const keyActionItems: string[] = [];
  if (factors.criticalIncidentCount > 0) {
    keyActionItems.push('🚨 중대 안전사고 발생: 긴급 현장 조사 및 안전 대책 위원회 소집 필요');
  }
  if (factors.incidentCount > 0) {
    keyActionItems.push(`시설/안전 사고 미결 건(${factors.incidentCount}건) 현장 조치 확인`);
  }
  if (factors.vocComplaintCount >= 3) {
    keyActionItems.push(`고객 불만 VOC 누적(${factors.vocComplaintCount}건): 관리자 1:1 응대 및 원인 분석 요망`);
  }
  if (factors.npsDetractorRatio >= 0.3) {
    keyActionItems.push(`NPS 비추천자 비율 급증(${Math.round(factors.npsDetractorRatio * 100)}%): 서비스 품질 점검 필요`);
  }
  if (factors.unpaidInvoiceCount >= 5 || factors.overdueInvoiceRatio >= 0.2) {
    keyActionItems.push(`수납 연체율 경고: 미수금 청구서(${factors.unpaidInvoiceCount}건) 재발송 및 납부 독려`);
  }
  if (keyActionItems.length === 0) {
    keyActionItems.push('현재 모든 부서 핵심 리스크 지표가 안정 범위 내에서 유지되고 있습니다.');
  }

  return {
    riskScore: totalScore,
    grade,
    breakdown: {
      safetyScore,
      customerScore,
      financialScore,
    },
    keyActionItems,
  };
}
