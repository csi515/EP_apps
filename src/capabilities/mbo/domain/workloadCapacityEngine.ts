/**
 * MBO Workload Capacity & Threshold Engine
 *
 * Core-Capability-Preset 원칙을 준수하는 순수 비즈니스 로직 도메인 엔진.
 * - 신호등 부하 임계치(Thresholds) 동적 설정 및 판정
 * - 팀장/관리자/팀원 간 최소 권한 원칙(Least Privilege)에 따른 Data Scoping
 * - 팀 내 업무 재분배(Reassignment) 거버넌스 가드
 * - 연간 가용 캐퍼시티 대사(Capacity vs Demand Forecast) 계산
 */

export type WorkloadTrafficLight = 'green' | 'yellow' | 'red';

export interface WorkloadThresholds {
  /** 초록(안전) 상한선 (0 ~ green_max %, 기본 75%) */
  green_max: number;
  /** 노랑(주의) 상한선 (green_max ~ yellow_max %, 기본 85%, 초과 시 빨강 위험) */
  yellow_max: number;
}

export const DEFAULT_WORKLOAD_THRESHOLDS: WorkloadThresholds = {
  green_max: 75,
  yellow_max: 85,
};

/**
 * 부하 임계치 유효성 검증
 */
export function validateWorkloadThresholds(thresholds: WorkloadThresholds): {
  valid: boolean;
  error?: string;
} {
  const { green_max, yellow_max } = thresholds;

  if (typeof green_max !== 'number' || typeof yellow_max !== 'number') {
    return { valid: false, error: '임계치는 숫자여야 합니다.' };
  }

  if (green_max < 10) {
    return { valid: false, error: '안전(초록) 상한선은 최소 10% 이상이어야 합니다.' };
  }

  if (green_max >= yellow_max) {
    return {
      valid: false,
      error: '안전(초록) 상한선은 주의(노랑) 상한선보다 작아야 합니다.',
    };
  }

  if (yellow_max > 100) {
    return { valid: false, error: '주의(노랑) 상한선은 100% 이하여야 합니다.' };
  }

  return { valid: true };
}

/**
 * 부하율에 따른 신호등 판정
 */
export function determineWorkloadTrafficLight(
  workloadRatePercent: number,
  thresholds: WorkloadThresholds = DEFAULT_WORKLOAD_THRESHOLDS
): WorkloadTrafficLight {
  const safePercent = Math.max(0, workloadRatePercent);
  if (safePercent <= thresholds.green_max) {
    return 'green';
  }
  if (safePercent <= thresholds.yellow_max) {
    return 'yellow';
  }
  return 'red';
}

export type UserRole = 'owner' | 'director' | 'manager' | 'staff' | 'member';
export type WorkloadDataScopeType = 'all' | 'department' | 'self';

export interface WorkloadUserContext {
  userId: string;
  role: UserRole;
  departmentId?: string;
  departmentName?: string;
}

export interface WorkloadDataScope {
  scopeType: WorkloadDataScopeType;
  accessibleDepartmentId?: string;
  accessibleUserId?: string;
  canChangeDepartmentFilter: boolean;
  canManageThresholds: boolean;
}

/**
 * 사용자 역할과 부서 정보에 기반하여 조회 권한 스코프(Scope) 결정
 * - Owner/Director: 전사 부서 조회 및 부서 필터 변경 가능, 임계치 관리 가능
 * - Manager: 본인 부서만 조회 가능 (타 부서 원천 차단), 부서 필터 고정, 임계치 관리 가능
 * - Staff/Member: 본인 부하만 Self-View 가능, 임계치 변경 불가
 */
export function resolveWorkloadDataScope(user: WorkloadUserContext): WorkloadDataScope {
  if (user.role === 'owner' || user.role === 'director') {
    return {
      scopeType: 'all',
      canChangeDepartmentFilter: true,
      canManageThresholds: true,
    };
  }

  if (user.role === 'manager') {
    return {
      scopeType: 'department',
      accessibleDepartmentId: user.departmentId,
      canChangeDepartmentFilter: false,
      canManageThresholds: true,
    };
  }

  return {
    scopeType: 'self',
    accessibleUserId: user.userId,
    accessibleDepartmentId: user.departmentId,
    canChangeDepartmentFilter: false,
    canManageThresholds: false,
  };
}

export interface TeamMemberWorkloadItem {
  memberId: string;
  memberName: string;
  departmentId: string;
  departmentName: string;
  roleTitle: string;
  assignedTasksCount: number;
  capacityHoursPerWeek: number;
  assignedHoursPerWeek: number;
  workloadRatePercent: number;
  trafficLight?: WorkloadTrafficLight;
}

/**
 * 스코프에 따른 팀원 업무 부하 목록 필터링
 */
export function filterWorkloadDataByScope(
  items: TeamMemberWorkloadItem[],
  scope: WorkloadDataScope,
  selectedDepartmentId?: string,
  thresholds: WorkloadThresholds = DEFAULT_WORKLOAD_THRESHOLDS
): TeamMemberWorkloadItem[] {
  let filtered: TeamMemberWorkloadItem[] = [];

  switch (scope.scopeType) {
    case 'all':
      if (selectedDepartmentId && selectedDepartmentId !== 'ALL') {
        filtered = items.filter((item) => item.departmentId === selectedDepartmentId);
      } else {
        filtered = [...items];
      }
      break;

    case 'department':
      filtered = items.filter((item) => item.departmentId === scope.accessibleDepartmentId);
      break;

    case 'self':
      filtered = items.filter((item) => item.memberId === scope.accessibleUserId);
      break;

    default:
      filtered = [];
  }

  return filtered.map((item) => ({
    ...item,
    trafficLight: determineWorkloadTrafficLight(item.workloadRatePercent, thresholds),
  }));
}

export interface ReassignWorkloadRequest {
  taskId: string;
  taskTitle: string;
  taskHours: number;
  fromMember: TeamMemberWorkloadItem;
  toMember: TeamMemberWorkloadItem;
  operator: WorkloadUserContext;
}

/**
 * 업무 재분배 가드
 * - 팀장은 자기 팀 소속 팀원 간에만 재분배 가능
 * - 일반 직원은 재분배 불가
 * - 출발/도착 팀원이 같으면 무효
 */
export function canReassignWorkload(
  request: ReassignWorkloadRequest
): { allowed: boolean; reason?: string } {
  const { fromMember, toMember, operator } = request;

  if (fromMember.memberId === toMember.memberId) {
    return { allowed: false, reason: '동일한 담당자에게는 업무를 재분배할 수 없습니다.' };
  }

  if (operator.role !== 'owner' && operator.role !== 'director' && operator.role !== 'manager') {
    return { allowed: false, reason: '업무 재분배는 부서 관리자(팀장) 이상의 권한이 필요합니다.' };
  }

  if (operator.role === 'manager') {
    if (
      fromMember.departmentId !== operator.departmentId ||
      toMember.departmentId !== operator.departmentId
    ) {
      return {
        allowed: false,
        reason: '팀장은 본인이 관할하는 부서 내 팀원 간에만 업무를 재분배할 수 있습니다.',
      };
    }
  }

  return { allowed: true };
}

export interface YearlyCapacityForecastInput {
  departmentId: string;
  departmentName: string;
  headcount: number;
  workingWeeksPerYear?: number;
  hoursPerWeekPerPerson?: number;
  totalPlannedProjectHours: number;
}

export interface YearlyCapacityForecastResult {
  departmentId: string;
  departmentName: string;
  headcount: number;
  totalAvailableHours: number;
  totalPlannedProjectHours: number;
  utilizationRatePercent: number;
  surplusOrDeficitHours: number;
  trafficLight: WorkloadTrafficLight;
  recommendation: string;
}

/**
 * 연간 목표 대비 부서별 가용 캐퍼시티 예측 대사 계산
 */
export function calculateYearlyCapacityForecast(
  input: YearlyCapacityForecastInput,
  thresholds: WorkloadThresholds = DEFAULT_WORKLOAD_THRESHOLDS
): YearlyCapacityForecastResult {
  const weeks = input.workingWeeksPerYear ?? 50;
  const hoursPerWeek = input.hoursPerWeekPerPerson ?? 40;
  const totalAvailableHours = Math.max(1, input.headcount * weeks * hoursPerWeek);

  const utilizationRatePercent = Math.round(
    (input.totalPlannedProjectHours / totalAvailableHours) * 100
  );
  const surplusOrDeficitHours = totalAvailableHours - input.totalPlannedProjectHours;
  const trafficLight = determineWorkloadTrafficLight(utilizationRatePercent, thresholds);

  let recommendation = '안정적인 가용 역량 범위 내에서 프로젝트가 계획되었습니다.';
  if (trafficLight === 'yellow') {
    recommendation =
      '가용 캐퍼시티의 주의 임계치에 도달했습니다. 추가 프로젝트 착수 시 일정 완충을 고려하십시오.';
  } else if (trafficLight === 'red') {
    recommendation =
      '가용 캐퍼시티를 초과하거나 과부하 위험이 있습니다. 인력 충원 또는 목표 우선순위 조정이 필요합니다.';
  }

  return {
    departmentId: input.departmentId,
    departmentName: input.departmentName,
    headcount: input.headcount,
    totalAvailableHours,
    totalPlannedProjectHours: input.totalPlannedProjectHours,
    utilizationRatePercent,
    surplusOrDeficitHours,
    trafficLight,
    recommendation,
  };
}
