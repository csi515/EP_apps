/**
 * Moa-v2 업종별 경영 건전성 자동 진단(Business Health Diagnostic) 엔진.
 *
 * 단순 통계(매출액, 회원수)를 넘어, 업종별 특화 KPI 공식과 실시간 지표를 분석하여
 * 종합 건전성 등급 및 '사장님을 위한 오늘의 처방(Actionable Coaching Tip)'을 자동 생성한다.
 *
 * 비용 0원 원칙: 순수 TypeScript 도메인 함수로 동작.
 */

export type HealthGrade = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'ATTENTION' | 'CRITICAL';

export interface HealthMetricItem {
  id: string;
  name: string; // 지표명 (예: "수강권 재등록률", "미출석 이탈 위험", "유통기한 임박")
  value: number; // 수치
  unit: string; // 단위 (예: "%", "명", "건")
  formattedValue: string; // 표기값 (예: "82.5%", "3명")
  benchmark: string; // 적정 기준 (예: "70% 이상 권장", "0건 유지")
  status: 'good' | 'warning' | 'danger';
  feedback: string; // 지표별 즉각 피드백
}

export interface BusinessCoachingPrescription {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionLabel?: string;
  actionTargetTab?: string;
}

export interface BusinessHealthReport {
  industryType: string;
  overallScore: number; // 0 ~ 100점
  overallGrade: HealthGrade;
  gradeLabel: string; // '최우수' | '우수' | '보통' | '주의' | '개선 필요'
  gradeColor: 'emerald' | 'indigo' | 'amber' | 'rose';
  summaryHeadline: string; // 대시보드 대표 헤드라인
  metrics: HealthMetricItem[];
  prescriptions: BusinessCoachingPrescription[];
  evaluatedAt: string;
}

export interface BusinessDiagnosticInput {
  totalCustomers: number;
  activeCustomers: number;
  expiringCustomersThisMonth?: number;
  reEnrolledCustomersThisMonth?: number;
  inactiveTwoWeeksCount?: number;
  inventoryExpiringLotsCount?: number;
  outOfStockItemsCount?: number;
  spaceUtilizationRate?: number; // 0 ~ 100%
  uncollectedBillCount?: number; // 미수금 건수
  avgLeadResponseHours?: number; // 상담 문의 응대 시간
}

/**
 * 업종군 분류 판정
 */
function classifyIndustryGroup(industryType: string): 'membership' | 'retail_fnb' | 'space_rental' | 'dispatch' | 'general' {
  const norm = (industryType || '').toLowerCase();

  if (
    norm.includes('piano') ||
    norm.includes('taekwondo') ||
    norm.includes('pilates') ||
    norm.includes('gym') ||
    norm.includes('fitness') ||
    norm.includes('academy') ||
    norm.includes('ballet') ||
    norm.includes('art') ||
    norm.includes('math') ||
    norm.includes('english') ||
    norm.includes('skin') ||
    norm.includes('beauty') ||
    norm.includes('hair') ||
    norm.includes('nail')
  ) {
    return 'membership'; // 회원권/레슨/정기결제 기반
  }

  if (
    norm.includes('study') ||
    norm.includes('space') ||
    norm.includes('party_room') ||
    norm.includes('hotel') ||
    norm.includes('motel') ||
    norm.includes('guesthouse') ||
    norm.includes('bath') ||
    norm.includes('sauna')
  ) {
    return 'space_rental'; // 공간 및 시설 대여형
  }

  if (
    norm.includes('retail') ||
    norm.includes('cafe') ||
    norm.includes('restaurant') ||
    norm.includes('bakery') ||
    norm.includes('food') ||
    norm.includes('bar')
  ) {
    return 'retail_fnb'; // 식음료 및 상품 소매형
  }

  if (
    norm.includes('dispatch') ||
    norm.includes('cleaning') ||
    norm.includes('repair') ||
    norm.includes('plumbing')
  ) {
    return 'dispatch'; // 현장 출장·파견형
  }

  return 'general';
}

/**
 * 업종별 경영 건전성 분석 및 자동 처방 진단 실행 (Pure Function)
 */
export function evaluateBusinessHealth(
  industryType: string,
  input: BusinessDiagnosticInput
): BusinessHealthReport {
  const group = classifyIndustryGroup(industryType);
  const metrics: HealthMetricItem[] = [];
  const prescriptions: BusinessCoachingPrescription[] = [];
  let score = 80; // 기본 출발점

  const total = Math.max(1, input.totalCustomers);
  const activeRatio = Math.min(100, Math.round((input.activeCustomers / total) * 100));

  // 1. 공통 지표: 활동 회원 비율
  if (activeRatio >= 70) {
    metrics.push({
      id: 'active_ratio',
      name: '회원 활동 유지율',
      value: activeRatio,
      unit: '%',
      formattedValue: `${activeRatio}%`,
      benchmark: '70% 이상',
      status: 'good',
      feedback: '재원/활동 회원의 참여도가 매우 건강합니다.',
    });
    score += 5;
  } else if (activeRatio >= 50) {
    metrics.push({
      id: 'active_ratio',
      name: '회원 활동 유지율',
      value: activeRatio,
      unit: '%',
      formattedValue: `${activeRatio}%`,
      benchmark: '70% 이상',
      status: 'warning',
      feedback: '휴면 및 장기 미참여 회원이 증가하고 있습니다.',
    });
    score -= 5;
  } else {
    metrics.push({
      id: 'active_ratio',
      name: '회원 활동 유지율',
      value: activeRatio,
      unit: '%',
      formattedValue: `${activeRatio}%`,
      benchmark: '70% 이상',
      status: 'danger',
      feedback: '휴면 회원 비중이 높아 재활성화 이벤트가 시급합니다.',
    });
    score -= 15;
  }

  // 2. 업종군별 특화 KPI 공식 계산
  if (group === 'membership') {
    // KPI [1]: 재등록률 = (당월 재등록 / 만료자) * 100
    const expiring = input.expiringCustomersThisMonth ?? 10;
    const reEnrolled = input.reEnrolledCustomersThisMonth ?? 8;
    const retentionRate = expiring > 0 ? Math.min(100, Math.round((reEnrolled / expiring) * 100)) : 100;

    if (retentionRate >= 75) {
      metrics.push({
        id: 'retention_rate',
        name: '수강권 재등록률',
        value: retentionRate,
        unit: '%',
        formattedValue: `${retentionRate}%`,
        benchmark: '75% 이상 권장',
        status: 'good',
        feedback: '만료 예정 회원 대다수가 연장하여 매장 락인이 견고합니다.',
      });
      score += 10;
    } else if (retentionRate >= 60) {
      metrics.push({
        id: 'retention_rate',
        name: '수강권 재등록률',
        value: retentionRate,
        unit: '%',
        formattedValue: `${retentionRate}%`,
        benchmark: '75% 이상 권장',
        status: 'warning',
        feedback: '만료 전 선제적 재등록 혜택 안내를 권장합니다.',
      });
      prescriptions.push({
        priority: 'high',
        title: '만료 7일 전 재등록 우대 프로모션 발송',
        description: '만료 예정 회원에게 조기 연장 시 5% 할인 혜택을 제공해보세요.',
        actionLabel: '만료 예정자 보기',
        actionTargetTab: 'passes',
      });
    } else {
      metrics.push({
        id: 'retention_rate',
        name: '수강권 재등록률',
        value: retentionRate,
        unit: '%',
        formattedValue: `${retentionRate}%`,
        benchmark: '75% 이상 권장',
        status: 'danger',
        feedback: '이탈 회원이 많습니다. 서비스 만족도 점검이 필요합니다.',
      });
      score -= 20;
      prescriptions.push({
        priority: 'high',
        title: '긴급 이탈 방지 해피콜 및 설문 실시',
        description: '최근 미연장 사유를 파악하고 맞춤형 케어 상담을 진행하세요.',
        actionLabel: '상담 일지 작성',
        actionTargetTab: 'consultation',
      });
    }

    // KPI [2]: 2주 이상 미출석 이탈 위험자
    const inactiveCount = input.inactiveTwoWeeksCount ?? 2;
    if (inactiveCount > 0) {
      metrics.push({
        id: 'churn_risk',
        name: '미출석 이탈 위험',
        value: inactiveCount,
        unit: '명',
        formattedValue: `${inactiveCount}명`,
        benchmark: '0명 목표',
        status: inactiveCount > 5 ? 'danger' : 'warning',
        feedback: '최근 14일 동안 출석이 없는 회원이 있습니다.',
      });
      score -= inactiveCount * 3;
      prescriptions.push({
        priority: 'medium',
        title: `장기 미출석 회원 ${inactiveCount}명 안부 톡 발송`,
        description: '가벼운 안부 메시지만으로도 30% 이상의 출석 복귀 효과가 있습니다.',
        actionLabel: '출결 현황 확인',
        actionTargetTab: 'attendance',
      });
    }
  } else if (group === 'retail_fnb') {
    // KPI [1]: 유통기한 임박 롯(Lot) 수
    const expiringLots = input.inventoryExpiringLotsCount ?? 0;
    if (expiringLots > 0) {
      metrics.push({
        id: 'expiring_lots',
        name: '유통기한 임박 원자재',
        value: expiringLots,
        unit: '건',
        formattedValue: `${expiringLots}건`,
        benchmark: '0건 유지',
        status: 'danger',
        feedback: '7일 이내 폐기 위험 품목이 감지되었습니다.',
      });
      score -= 15;
      prescriptions.push({
        priority: 'high',
        title: '임박 재고 우선 소진(FEFO) 조치',
        description: '유통기한 임박 원자재를 오늘 제조/메뉴에 우선 투입하세요.',
        actionLabel: '재고 대장 확인',
        actionTargetTab: 'inventory',
      });
    } else {
      metrics.push({
        id: 'expiring_lots',
        name: '원자재 신선도',
        value: 0,
        unit: '건',
        formattedValue: '안전',
        benchmark: '0건 유지',
        status: 'good',
        feedback: '모든 식자재와 상품이 안전 기한 내에 있습니다.',
      });
      score += 5;
    }

    // KPI [2]: 품절/안전재고 미달 수
    const outOfStock = input.outOfStockItemsCount ?? 0;
    if (outOfStock > 0) {
      metrics.push({
        id: 'out_of_stock',
        name: '안전재고 부족 품목',
        value: outOfStock,
        unit: '종',
        formattedValue: `${outOfStock}종`,
        benchmark: '0종 유지',
        status: 'warning',
        feedback: '주요 필수 부자재의 품절 위험이 있습니다.',
      });
      score -= 10;
      prescriptions.push({
        priority: 'medium',
        title: '부족 품목 공급업체 발주서 등록',
        description: '영업 중단 방지를 위해 자동 발주 권장 수량을 확인하세요.',
        actionLabel: '발주 관리',
        actionTargetTab: 'inventory',
      });
    }
  } else if (group === 'space_rental') {
    // KPI [1]: 공간 가동률
    const utilRate = input.spaceUtilizationRate ?? 68;
    if (utilRate >= 65) {
      metrics.push({
        id: 'space_util',
        name: '공간 시간 가동률',
        value: utilRate,
        unit: '%',
        formattedValue: `${utilRate}%`,
        benchmark: '65% 이상',
        status: 'good',
        feedback: '룸과 좌석이 높은 회전율로 효율적으로 가동 중입니다.',
      });
      score += 10;
    } else {
      metrics.push({
        id: 'space_util',
        name: '공간 시간 가동률',
        value: utilRate,
        unit: '%',
        formattedValue: `${utilRate}%`,
        benchmark: '65% 이상',
        status: 'warning',
        feedback: '비수기/낮 시간대 유휴 공간이 발생하고 있습니다.',
      });
      score -= 10;
      prescriptions.push({
        priority: 'medium',
        title: '낮 시간대 타임 세일 요금제 적용',
        description: '공실 시간대에 20% 특별 할인을 설정해 가동률을 끌어올려 보세요.',
        actionLabel: '요금제 설정',
        actionTargetTab: 'seat_room',
      });
    }
  }

  // 3. 미수금 건수 공통 점검
  const uncollected = input.uncollectedBillCount ?? 0;
  if (uncollected > 0) {
    metrics.push({
      id: 'uncollected_bills',
      name: '미납 및 미수금',
      value: uncollected,
      unit: '건',
      formattedValue: `${uncollected}건`,
      benchmark: '0건 유지',
      status: uncollected > 3 ? 'danger' : 'warning',
      feedback: '입금 기한이 경과된 미납 청구서가 있습니다.',
    });
    score -= uncollected * 5;
    prescriptions.push({
      priority: 'high',
      title: '미납 청구서 자동 알림 재발송',
      description: '간편 모바일 납부 링크가 포함된 청구서를 재전송하세요.',
      actionLabel: '수납 대장',
      actionTargetTab: 'billing',
    });
  }

  // 4. 점수 정규화 및 최종 등급 판정
  const finalScore = Math.max(0, Math.min(100, score));

  let overallGrade: HealthGrade = 'GOOD';
  let gradeLabel = '양호';
  let gradeColor: BusinessHealthReport['gradeColor'] = 'indigo';
  let headline = '매장이 안정적으로 순항하고 있습니다.';

  if (finalScore >= 90) {
    overallGrade = 'EXCELLENT';
    gradeLabel = '최우수';
    gradeColor = 'emerald';
    headline = '축하합니다! 전반적인 매장 경영 지표가 최고 수준입니다.';
  } else if (finalScore >= 75) {
    overallGrade = 'GOOD';
    gradeLabel = '우수';
    gradeColor = 'indigo';
    headline = '매장이 견고하게 성장하고 있으며, 작은 개선점만 보완하면 됩니다.';
  } else if (finalScore >= 60) {
    overallGrade = 'FAIR';
    gradeLabel = '보통';
    gradeColor = 'amber';
    headline = '운영에 큰 무리는 없으나, 일부 고객 리텐션 관리가 필요합니다.';
  } else if (finalScore >= 40) {
    overallGrade = 'ATTENTION';
    gradeLabel = '주의';
    gradeColor = 'amber';
    headline = '이탈 및 미수금 등 몇 가지 주의 지표가 감지되었습니다.';
  } else {
    overallGrade = 'CRITICAL';
    gradeLabel = '개선 시급';
    gradeColor = 'rose';
    headline = '매장 수익성 방어를 위해 긴급 처방 액션이 필요합니다.';
  }

  if (prescriptions.length === 0) {
    prescriptions.push({
      priority: 'low',
      title: '단골 회원 맞춤 칭찬 알림 발송',
      description: '출석률이 높은 우수 회원에게 격려 메시지를 보내 단골을 굳혀보세요.',
      actionLabel: '회원 목록',
      actionTargetTab: 'roster',
    });
  }

  return {
    industryType,
    overallScore: finalScore,
    overallGrade,
    gradeLabel,
    gradeColor,
    summaryHeadline: headline,
    metrics,
    prescriptions,
    evaluatedAt: new Date().toISOString(),
  };
}
