/**
 * MBO 이원화 잠금: Level-1 목표(Strict) vs Level-2 실행 프로젝트(Flexible)
 */
import { areGoalsLocked, type MboCycleSettings } from './mboCycle';
import type { MboStatus } from './mboEngine';

export type MboGoalLockStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'LOCKED' | 'CHANGE_REQUESTED';

export type MboGoalLockView = {
  lockStatus: MboGoalLockStatus;
  /** KPI·가중치·목표 문장 직접 수정 불가 */
  isStrictLocked: boolean;
  /** 주기 잠금 중이나 부서장이 담당 목표를 직접 수정 가능 */
  managerOverrideActive?: boolean;
};

const CONFIRMED_STATUSES: readonly MboStatus[] = ['approved', 'in_progress', 'completed'];

export function isCycleGoalsLocked(settings: MboCycleSettings, onDate: Date = new Date()): boolean {
  return areGoalsLocked(settings, onDate);
}

/** Level-2: 간트·체크인·진척은 MBO 잠금과 무관하게 편집 가능 */
export function canEditExecutionProject(): boolean {
  return true;
}

export function canEditMboGoalFields(
  status: MboStatus,
  cycleLocked: boolean,
  opts?: { canOverrideCycleLock?: boolean },
): boolean {
  if (opts?.canOverrideCycleLock) return true;
  if (cycleLocked) return false;
  return status === 'draft' || status === 'rejected';
}

/**
 * 주기 잠금 중 부서장·조직관리자가 특정 owner 목표를 직접 다룰 수 있는지(호출측에서 canManageObjectiveOwner 등으로 판정)
 */
export function canManagerOverrideCycleGoalLock(
  cycleLocked: boolean,
  canManageObjectiveOwner: boolean,
): boolean {
  return cycleLocked && canManageObjectiveOwner;
}

export function resolveMboGoalLockView(
  status: MboStatus,
  cycleLocked: boolean,
  canOverrideLock = false,
): MboGoalLockView {
  let base: MboGoalLockView;
  if (status === 'submitted') {
    base = {
      lockStatus: cycleLocked ? 'CHANGE_REQUESTED' : 'PENDING_APPROVAL',
      isStrictLocked: true,
    };
  } else if (cycleLocked && CONFIRMED_STATUSES.includes(status)) {
    base = { lockStatus: 'LOCKED', isStrictLocked: true };
  } else if (cycleLocked && status !== 'draft' && status !== 'rejected' && status !== 'canceled') {
    base = { lockStatus: 'LOCKED', isStrictLocked: true };
  } else if (cycleLocked) {
    base = { lockStatus: 'LOCKED', isStrictLocked: true };
  } else {
    base = { lockStatus: 'DRAFT', isStrictLocked: false };
  }
  return {
    lockStatus: base.lockStatus,
    isStrictLocked: base.isStrictLocked && !canOverrideLock,
    managerOverrideActive: canOverrideLock && cycleLocked,
  };
}

export function goalLockStatusLabel(lockStatus: MboGoalLockStatus): string {
  switch (lockStatus) {
    case 'LOCKED':
      return '목표 확정';
    case 'PENDING_APPROVAL':
      return '승인 대기';
    case 'CHANGE_REQUESTED':
      return '변경 요청 중';
    default:
      return '수정 가능';
  }
}

/** UI에서는 이모지 대신 상태 문구만 쓴다. 호환용으로 빈 문자열 유지. */
export function goalLockStatusEmoji(_lockStatus: MboGoalLockStatus): string {
  return '';
}

export function countPendingGoalApprovals(
  objectives: readonly { status: MboStatus; ownerId?: string | null }[],
  teamUserIds?: readonly string[],
): number {
  const team = teamUserIds ? new Set(teamUserIds) : null;
  return objectives.filter(
    (o) =>
      o.status === 'submitted' &&
      (!team || (o.ownerId && team.has(o.ownerId))),
  ).length;
}

/** 팀원의 MBO가 확정 잠금(주기 잠금 + 승인 상태)인지 */
export function isMemberMboLocked(
  ownedObjectives: readonly { status: MboStatus }[],
  cycleLocked: boolean,
): boolean {
  if (ownedObjectives.length === 0) return false;
  if (!cycleLocked) return false;
  return ownedObjectives.every((o) => CONFIRMED_STATUSES.includes(o.status) || o.status === 'submitted');
}

/** MBO 목표 확정률: 잠금 대상 중 승인·진행·완료 비율 */
export function computeMboLockRatioLabel(
  objectives: readonly { status: MboStatus; ownerId: string | null }[],
  teamUserIds: readonly string[],
  cycleLocked: boolean,
): { label: string; lockedCount: number; teamSize: number } {
  const owners = teamUserIds.filter(Boolean);
  const teamSize = owners.length;
  if (teamSize === 0) return { label: '0/0명 확정', lockedCount: 0, teamSize: 0 };
  let lockedCount = 0;
  for (const uid of owners) {
    const owned = objectives.filter((o) => o.ownerId === uid);
    if (owned.length === 0) continue;
    const ok = owned.every((o) => {
      if (!cycleLocked) {
        return ['approved', 'in_progress', 'completed'].includes(o.status);
      }
      return CONFIRMED_STATUSES.includes(o.status);
    });
    if (ok) lockedCount += 1;
  }
  return {
    label: `${lockedCount}/${teamSize}명 확정 완료`,
    lockedCount,
    teamSize,
  };
}

export function countMembersMissingCheckin(
  projects: readonly { id: string; ownerId: string | null }[],
  missingProjectIds: readonly string[],
  teamUserIds: readonly string[],
): number {
  const missing = new Set(missingProjectIds);
  const owners = new Set<string>();
  for (const p of projects) {
    if (p.ownerId && missing.has(p.id) && teamUserIds.includes(p.ownerId)) {
      owners.add(p.ownerId);
    }
  }
  return owners.size;
}
