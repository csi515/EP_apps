/**
 * MBO 목표 트리 계층 권한 — 상급자 목표 선행 · 자기 단계만 입력
 * (순수 함수, DB/UI 비의존)
 */
import type { MboLevel } from './mboEngine';

/** 숫자가 작을수록 상위 목표 계층 */
export const MBO_LEVEL_RANK: Record<MboLevel, number> = {
  company: 0,
  department: 1,
  individual: 2,
  project: 3,
};

export type GoalHierarchyActor = {
  /** organization_members.role === 'owner' 또는 대표이사 직급 */
  isTopExecutive: boolean;
  /** 조직도 DESCENDANTS 리더(실장·그룹장·팀장 등) */
  isUnitLeader: boolean;
  /** 리더로 맡은 부서 id */
  ledDepartmentIds: readonly string[];
  /** organization_roles.rank_order (작을수록 상위). 없으면 null */
  rankOrder: number | null;
  roleName?: string | null;
};

export type ExistingGoalRef = {
  id: string;
  level: MboLevel;
  parentId?: string | null;
  deletedAt?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
};

export type CreateGoalRequest = {
  level: MboLevel;
  parentId: string | null;
  /** 부서 목표일 때 대상 부서 */
  departmentId?: string | null;
  departmentName?: string | null;
};

const TOP_EXEC_NAME = /대표\s*이사|사장|회장/;

/** 직급명·rank_order로 최상위 경영자 여부 */
export function isTopExecutiveRole(input: {
  memberRole?: string | null;
  roleName?: string | null;
  rankOrder?: number | null;
}): boolean {
  if (input.memberRole === 'owner') return true;
  const name = (input.roleName ?? '').trim();
  if (name && TOP_EXEC_NAME.test(name)) return true;
  if (typeof input.rankOrder === 'number' && input.rankOrder > 0 && input.rankOrder <= 100) {
    return true;
  }
  return false;
}

/** 액터가 생성 가능한 최고 MboLevel */
export function resolveMaxCreatableLevel(actor: GoalHierarchyActor): MboLevel {
  if (actor.isTopExecutive) return 'company';
  if (actor.isUnitLeader || actor.ledDepartmentIds.length > 0) return 'department';
  return 'individual';
}

export function listCreatableLevels(actor: GoalHierarchyActor): MboLevel[] {
  const max = resolveMaxCreatableLevel(actor);
  const maxRank = MBO_LEVEL_RANK[max];
  return (Object.keys(MBO_LEVEL_RANK) as MboLevel[]).filter(
    (level) => MBO_LEVEL_RANK[level] >= maxRank && level !== 'project'
  );
}

function isActiveGoal(goal: ExistingGoalRef): boolean {
  return !goal.deletedAt;
}

/** 상위 계층 목표가 이미 등록되어 있는지 */
export function hasPrerequisiteGoals(
  level: MboLevel,
  existing: readonly ExistingGoalRef[]
): boolean {
  const active = existing.filter(isActiveGoal);
  if (level === 'company') return true;
  if (level === 'department') {
    return active.some((g) => g.level === 'company');
  }
  // individual / project: 전사 또는 부서(조직단위) 목표가 선행되어야 함
  return active.some((g) => g.level === 'company' || g.level === 'department');
}

export function prerequisiteLabel(level: MboLevel): string {
  if (level === 'department') return '전사(대표이사) 목표';
  if (level === 'individual' || level === 'project') return '상위(전사·조직단위) 목표';
  return '';
}

export function levelLabelKo(level: MboLevel): string {
  switch (level) {
    case 'company':
      return '전사 목표';
    case 'department':
      return '조직단위(실·그룹·팀) 목표';
    case 'individual':
      return '개인 KPI';
    case 'project':
      return '프로젝트';
    default:
      return level;
  }
}

/**
 * 목표 생성 가능 여부.
 * - 자기보다 상위 계층 목표 생성 금지
 * - 상위 계층 목표 선행 필수
 * - 부모는 반드시 더 상위 계층
 * - 조직단위 목표는 본인이 리더인 부서만
 */
export function validateGoalCreation(input: {
  actor: GoalHierarchyActor;
  request: CreateGoalRequest;
  existing: readonly ExistingGoalRef[];
}): { allowed: boolean; reason?: string } {
  const { actor, request, existing } = input;
  const maxLevel = resolveMaxCreatableLevel(actor);
  const maxRank = MBO_LEVEL_RANK[maxLevel];
  const reqRank = MBO_LEVEL_RANK[request.level];

  if (reqRank < maxRank) {
    return {
      allowed: false,
      reason: `자기보다 상급 단계(${levelLabelKo(request.level)}) 목표는 등록할 수 없습니다. 현재 가능한 최고 단계: ${levelLabelKo(maxLevel)}.`,
    };
  }

  if (!hasPrerequisiteGoals(request.level, existing)) {
    return {
      allowed: false,
      reason: `${prerequisiteLabel(request.level)}가 먼저 등록된 뒤에 입력할 수 있습니다.`,
    };
  }

  if (request.level === 'company') {
    if (request.parentId) {
      return { allowed: false, reason: '전사 목표는 상위 부모 없이 등록합니다.' };
    }
    return { allowed: true };
  }

  if (request.level === 'department') {
    if (!actor.isUnitLeader && actor.ledDepartmentIds.length === 0 && !actor.isTopExecutive) {
      return {
        allowed: false,
        reason: '조직단위 목표는 해당 실·그룹·팀의 리더만 등록할 수 있습니다.',
      };
    }
    if (actor.ledDepartmentIds.length > 0) {
      if (!request.departmentId) {
        return {
          allowed: false,
          reason: '목표를 설정할 조직(실·그룹·팀)을 선택하세요.',
        };
      }
      if (!actor.ledDepartmentIds.includes(request.departmentId)) {
        return {
          allowed: false,
          reason: '본인이 리더로 맡은 조직의 목표만 설정할 수 있습니다.',
        };
      }
    }
  }

  const parentId = request.parentId;
  if (!parentId) {
    return {
      allowed: false,
      reason: `${levelLabelKo(request.level)}는 상위 목표를 부모로 선택한 뒤 등록해야 합니다.`,
    };
  }

  const parent = existing.find((g) => g.id === parentId && isActiveGoal(g));
  if (!parent) {
    return { allowed: false, reason: '선택한 상위 목표를 찾을 수 없습니다.' };
  }

  if (MBO_LEVEL_RANK[parent.level] >= reqRank) {
    return {
      allowed: false,
      reason: '부모 목표는 자신보다 상위 단계여야 합니다. 상급자 목표 아래에서만 등록할 수 있습니다.',
    };
  }

  return { allowed: true };
}

/** 등록 폼에서 부모로 고를 수 있는 상위 목표 */
export function listEligibleParentGoals(
  childLevel: MboLevel,
  existing: readonly ExistingGoalRef[]
): ExistingGoalRef[] {
  const childRank = MBO_LEVEL_RANK[childLevel];
  return existing.filter(
    (g) => isActiveGoal(g) && MBO_LEVEL_RANK[g.level] < childRank
  );
}
