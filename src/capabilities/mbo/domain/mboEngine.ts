/**
 * MBO (Management by Objectives) Domain Engine
 *
 * Core-Capability-Preset 아키텍처 원칙을 준수하는 순수 비즈니스 로직 엔진.
 * 프레임워크나 외부 DB 의존성이 없으며 100% 단위 테스트 커버리지를 제공합니다.
 */

export type MboStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'canceled';

export type MboLevel = 'company' | 'department' | 'individual' | 'project';

export type MboEvaluationGrade = 'S' | 'A' | 'B' | 'C' | 'D';

export type MboEvaluationType = 'self' | 'peer' | 'manager' | 'executive' | 'final';

export interface MboObjectiveItem {
  id: string;
  parentId: string | null;
  level: MboLevel;
  title: string;
  weight: number;
  progressRate: number;
  status: MboStatus;
}

export interface MboProjectItem {
  id: string;
  objectiveId: string;
  title: string;
  weight?: number;
  progressRate: number;
  status: MboStatus;
}

export interface MboEvaluationPayload {
  score: number;
  grade?: MboEvaluationGrade;
  qualitativeFeedback: string;
  evaluationType: MboEvaluationType;
  isConfidential?: boolean;
}

/**
 * MBO 생명주기 상태 전이 허용 여부 판정
 *
 * @param current 현재 상태
 * @param next 전이할 목표 상태
 * @param options.isManager 관리자/승인권자 여부
 * @param options.rejectionReason 반려 시 필수 사유
 */
export function canTransitionMboStatus(
  current: MboStatus,
  next: MboStatus,
  options: { isManager?: boolean; rejectionReason?: string } = {}
): { allowed: boolean; reason?: string } {
  if (current === next) {
    return { allowed: true };
  }

  const { isManager = false, rejectionReason } = options;

  switch (current) {
    case 'draft':
      if (next === 'submitted') {
        return { allowed: true };
      }
      if (next === 'approved' && isManager) {
        // 관리자가 직접 바로 승인하는 경우 허용
        return { allowed: true };
      }
      if (next === 'canceled') {
        return { allowed: true };
      }
      return { allowed: false, reason: '작성 중인 계획은 승인 요청 또는 취소만 가능합니다.' };

    case 'submitted':
      if (next === 'approved') {
        if (!isManager) {
          return { allowed: false, reason: '계획 승인은 관리자 권한이 필요합니다.' };
        }
        return { allowed: true };
      }
      if (next === 'rejected') {
        if (!isManager) {
          return { allowed: false, reason: '계획 반려는 관리자 권한이 필요합니다.' };
        }
        if (!rejectionReason || rejectionReason.trim().length === 0) {
          return { allowed: false, reason: '반려 시에는 구체적인 사유를 입력해야 합니다.' };
        }
        return { allowed: true };
      }
      if (next === 'draft') {
        // 작성자가 승인 요청 회수
        return { allowed: true };
      }
      return { allowed: false, reason: '승인 요청 상태에서는 승인, 반려, 회수만 가능합니다.' };

    case 'rejected':
      if (next === 'draft' || next === 'submitted') {
        // 수정 후 재작성 또는 재제출
        return { allowed: true };
      }
      if (next === 'canceled') {
        return { allowed: true };
      }
      return { allowed: false, reason: '반려된 계획은 수정 후 재제출하거나 취소할 수 있습니다.' };

    case 'approved':
      if (next === 'in_progress') {
        return { allowed: true };
      }
      if (next === 'draft' || next === 'submitted') {
        // 승인 후 계획 변경 시 재승인 라인 진입
        return { allowed: true };
      }
      if (next === 'completed' || next === 'canceled') {
        return { allowed: true };
      }
      return { allowed: false, reason: '승인된 계획은 실행, 완료, 취소 또는 재승인 요청만 가능합니다.' };

    case 'in_progress':
      if (next === 'completed') {
        return { allowed: true };
      }
      if (next === 'canceled') {
        return { allowed: true };
      }
      if (next === 'submitted' && isManager) {
        // 대폭 수정 시 재검토 요청
        return { allowed: true };
      }
      return { allowed: false, reason: '진행 중인 목표는 완료 또는 취소만 가능합니다.' };

    case 'completed':
    case 'canceled':
      return { allowed: false, reason: '이미 완료되거나 취소된 계획은 상태를 변경할 수 없습니다.' };

    default:
      return { allowed: false, reason: '알 수 없는 상태입니다.' };
  }
}

/**
 * 목표 계층 순환 참조(Cycle) 감지
 *
 * @param allObjectives 테넌트 내 전체 목표 목록
 * @param targetId 부모를 변경하려는 대상 목표 ID
 * @param newParentId 새로 지정하려는 부모 목표 ID (null인 경우 최상위)
 * @returns true면 순환 참조 발생(차단 필요), false면 안전
 */
export function detectHierarchyCycle(
  allObjectives: Array<{ id: string; parentId: string | null }>,
  targetId: string,
  newParentId: string | null
): boolean {
  if (!newParentId) {
    // 최상위 노드로 설정하는 것은 순환 없음
    return false;
  }

  if (targetId === newParentId) {
    // 자기 자신을 부모로 지정 불가
    return true;
  }

  const parentMap = new Map<string, string | null>();
  for (const obj of allObjectives) {
    parentMap.set(obj.id, obj.parentId);
  }

  // newParentId부터 거슬러 올라가며 targetId가 나오는지 확인
  let current: string | null | undefined = newParentId;
  const visited = new Set<string>();

  while (current) {
    if (current === targetId) {
      return true; // 사이클 발견 (targetId가 newParentId의 조상임)
    }
    if (visited.has(current)) {
      // 기존 데이터에 이미 순환이 있는 경우 방어
      return true;
    }
    visited.add(current);
    current = parentMap.get(current);
  }

  return false;
}

/**
 * 하위 프로젝트/세부목표들의 가중치 기반 종합 진척도 계산
 *
 * @param items 가중치(weight)와 진척률(progressRate)을 가진 하위 항목 목록
 * @returns 0 ~ 100 사이의 가중 평균 진척도 (반올림 정수)
 */
export function calculateWeightedObjectiveProgress(
  items: Array<{ weight?: number; progressRate: number }>
): number {
  if (!items || items.length === 0) {
    return 0;
  }

  let totalWeight = 0;
  let weightedProgressSum = 0;

  for (const item of items) {
    const w = typeof item.weight === 'number' && item.weight > 0 ? item.weight : 1;
    const p = Math.max(0, Math.min(100, item.progressRate || 0));
    totalWeight += w;
    weightedProgressSum += p * w;
  }

  if (totalWeight === 0) {
    return 0;
  }

  return Math.round(weightedProgressSum / totalWeight);
}

/**
 * 정량 점수에 따른 자동 평가 등급 산정 (5단계)
 *
 * @param score 0 ~ 100 점수
 * @returns 'S' | 'A' | 'B' | 'C' | 'D'
 */
export function calculateGradeFromScore(score: number): MboEvaluationGrade {
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped >= 90) return 'S';
  if (clamped >= 80) return 'A';
  if (clamped >= 70) return 'B';
  if (clamped >= 60) return 'C';
  return 'D';
}

/**
 * 평가 페이로드 유효성 검증
 */
export function validateEvaluationPayload(payload: MboEvaluationPayload): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (typeof payload.score !== 'number' || isNaN(payload.score)) {
    errors.push('평가 점수는 필수 숫자값이어야 합니다.');
  } else if (payload.score < 0 || payload.score > 100) {
    errors.push('평가 점수는 0점에서 100점 사이여야 합니다.');
  }

  if (!payload.qualitativeFeedback || payload.qualitativeFeedback.trim().length === 0) {
    errors.push('정성 평가 의견은 필수 입력 항목입니다.');
  }

  const validTypes: MboEvaluationType[] = ['self' as const, 'peer' as const, 'manager' as const, 'executive' as const, 'final' as const];
  if (!validTypes.includes(payload.evaluationType)) {
    errors.push(`유효하지 않은 평가 유형입니다: ${payload.evaluationType}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 평가 결과 열람 접근 제어 검사 (비공개 권한 격리)
 *
 * @param params.isConfidential 비공개 평가 여부
 * @param params.targetUserId 피평가자 ID
 * @param params.evaluatorId 평가자 ID
 * @param params.currentUserId 현재 요청 사용자 ID
 * @param params.isOrgAdmin 조직 최고관리자/오너 여부
 */
export function canAccessEvaluation(params: {
  isConfidential: boolean;
  targetUserId: string | null;
  evaluatorId: string | null;
  currentUserId: string;
  isOrgAdmin: boolean;
}): boolean {
  const { isConfidential, targetUserId, evaluatorId, currentUserId, isOrgAdmin } = params;

  // 비공개가 아니면 같은 테넌트 내 공개 열람 가능
  if (!isConfidential) {
    return true;
  }

  // 최고 관리자/오너는 모든 평가 열람 가능
  if (isOrgAdmin) {
    return true;
  }

  // 본인이 피평가자이거나 평가자인 경우 열람 가능
  if (currentUserId && (currentUserId === targetUserId || currentUserId === evaluatorId)) {
    return true;
  }

  // 타 직원의 비공개 평가는 열람 차단
  return false;
}

export interface WeightValidationResult {
  valid: boolean;
  totalWeight: number;
  difference: number;
  message: string;
}

/**
 * 개인별 MBO 목표 가중치 합계 100% 실시간 유효성 검사
 */
export function validateMboObjectiveWeights(
  objectives: Array<{ weight?: number; title?: string }>
): WeightValidationResult {
  const totalWeight = objectives.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  const difference = 100 - totalWeight;
  const valid = totalWeight === 100;
  const message = valid
    ? '목표 가중치 합계가 100%로 유효합니다.'
    : difference > 0
      ? `목표 가중치 합계가 100%가 되어야 합니다. (${difference}% 추가 필요, 현재: ${totalWeight}%)`
      : `목표 가중치 합계가 100%를 초과했습니다. (${Math.abs(difference)}% 초과, 현재: ${totalWeight}%)`;

  return { valid, totalWeight, difference, message };
}

export interface MultiStageEvaluationScores {
  selfScore?: number | null;
  managerScore?: number | null;
  executiveScore?: number | null;
  weights?: {
    self?: number;
    manager?: number;
    executive?: number;
  };
}

export interface MultiStageEvaluationResult {
  totalScore: number;
  grade: MboEvaluationGrade;
  breakdown: {
    self: { score: number; weight: number; weightedScore: number };
    manager: { score: number; weight: number; weightedScore: number };
    executive: { score: number; weight: number; weightedScore: number };
  };
  isFullyCompleted: boolean;
}

/**
 * 3단계 다면평가(본인 자기평가 -> 1차 팀장평가 -> 2차 임원평가) 가중합산 종합 점수 산출
 */
export function calculateMultiStageMboEvaluationScore(
  stages: MultiStageEvaluationScores
): MultiStageEvaluationResult {
  const wSelf = stages.weights?.self ?? 20;
  const wManager = stages.weights?.manager ?? 50;
  const wExecutive = stages.weights?.executive ?? 30;

  const sSelf = Math.max(0, Math.min(100, stages.selfScore ?? 0));
  const sManager = Math.max(0, Math.min(100, stages.managerScore ?? 0));
  const sExecutive = Math.max(0, Math.min(100, stages.executiveScore ?? 0));

  const wsSelf = Number(((sSelf * wSelf) / 100).toFixed(2));
  const wsManager = Number(((sManager * wManager) / 100).toFixed(2));
  const wsExecutive = Number(((sExecutive * wExecutive) / 100).toFixed(2));

  const totalScore = Math.round(wsSelf + wsManager + wsExecutive);
  const grade = calculateGradeFromScore(totalScore);

  const isFullyCompleted =
    stages.selfScore !== undefined && stages.selfScore !== null &&
    stages.managerScore !== undefined && stages.managerScore !== null &&
    stages.executiveScore !== undefined && stages.executiveScore !== null;

  return {
    totalScore,
    grade,
    breakdown: {
      self: { score: sSelf, weight: wSelf, weightedScore: wsSelf },
      manager: { score: sManager, weight: wManager, weightedScore: wsManager },
      executive: { score: sExecutive, weight: wExecutive, weightedScore: wsExecutive },
    },
    isFullyCompleted,
  };
}

export interface MboDistributionComplianceResult {
  totalCount: number;
  counts: Record<MboEvaluationGrade, number>;
  percentages: Record<MboEvaluationGrade, number>;
  isCompliant: boolean;
  warnings: string[];
}

/**
 * S(10%)/A(20%)/B(60%)/C+D(10%) 평가 등급 정규분포 가이드라인 준수율 판정
 */
export function evaluateMboDistributionCompliance(
  items: Array<MboEvaluationGrade | { grade: MboEvaluationGrade }>
): MboDistributionComplianceResult {
  const counts: Record<MboEvaluationGrade, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  for (const item of items) {
    const grade = typeof item === 'string' ? item : item.grade;
    if (counts[grade] !== undefined) {
      counts[grade]++;
    }
  }

  const totalCount = items.length;
  const percentages: Record<MboEvaluationGrade, number> = {
    S: totalCount > 0 ? Number(((counts.S / totalCount) * 100).toFixed(1)) : 0,
    A: totalCount > 0 ? Number(((counts.A / totalCount) * 100).toFixed(1)) : 0,
    B: totalCount > 0 ? Number(((counts.B / totalCount) * 100).toFixed(1)) : 0,
    C: totalCount > 0 ? Number(((counts.C / totalCount) * 100).toFixed(1)) : 0,
    D: totalCount > 0 ? Number(((counts.D / totalCount) * 100).toFixed(1)) : 0,
  };

  const warnings: string[] = [];

  if (totalCount > 0) {
    if (percentages.S > 10) {
      warnings.push(`S등급 배분 비율(${percentages.S}%)이 권장 상한선(10%)을 초과했습니다.`);
    }
    if (percentages.S + percentages.A > 30) {
      warnings.push(`우수 등급(S+A) 합산 비율(${Number((percentages.S + percentages.A).toFixed(1))}%)이 권장 상한선(30%)을 초과했습니다.`);
    }
    if (totalCount >= 10 && percentages.C + percentages.D < 10) {
      warnings.push(`하위 등급(C+D) 비율(${Number((percentages.C + percentages.D).toFixed(1))}%)이 최소 권장 기준(10%)에 미달합니다.`);
    }
  }

  return {
    totalCount,
    counts,
    percentages,
    isCompliant: warnings.length === 0,
    warnings,
  };
}
