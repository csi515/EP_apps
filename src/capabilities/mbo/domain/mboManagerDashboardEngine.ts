/**
 * 부서장 대시보드 KPI·팀원 칩 (순수 함수)
 */
import type { MboStatus } from './mboEngine';
import { validateMboObjectiveWeights } from './mboEngine';
import type { PortfolioProject } from './projectPortfolioEngine';
import {
  computeMboLockRatioLabel,
  countMembersMissingCheckin,
  isMemberMboLocked,
} from './mboTwoTierLockEngine';

export type MboDashboardView = 'team_overview' | 'member_detail' | 'mine';

export type ProjectHealth = 'completed' | 'on_track' | 'at_risk' | 'delayed' | 'pending';

export type ManagerObjectiveRef = {
  id: string;
  ownerId: string | null;
  ownerName: string;
  title: string;
  status: MboStatus;
  weight: number;
  progressRate: number;
  startDate: string;
  targetDate: string;
};

export type TeamMemberChipModel = {
  userId: string;
  displayName: string;
  averageProgress: number;
  objectiveCount: number;
  weightValid: boolean;
  checkinOk: boolean;
  pendingApproval: boolean;
  mboLocked: boolean;
};

export type ManagerKpiModel = {
  teamAverageProgress: number;
  teamProgressDeltaLabel: string;
  goalSetupRatioLabel: string;
  goalSetupIncompleteNames: string[];
  mboLockRatioLabel: string;
  riskProjectCount: number;
  checkinPendingCount: number;
  checkinMissingMemberCount: number;
  approvalPendingCount: number;
};

function parseDay(iso: string): Date | null {
  if (!iso || iso.length < 10) return null;
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function classifyProjectHealth(
  project: Pick<PortfolioProject, 'status' | 'progressRate' | 'targetDate' | 'startDate'>,
  onDate: Date = new Date(),
): ProjectHealth {
  if (project.status === 'completed') return 'completed';
  if (project.status === 'draft' || project.status === 'submitted') return 'pending';
  const end = parseDay(project.targetDate);
  const today = parseDay(onDate.toISOString().slice(0, 10));
  if (!end || !today) return 'on_track';
  if (end < today && project.progressRate < 100) return 'delayed';
  const msLeft = end.getTime() - today.getTime();
  const daysLeft = msLeft / (24 * 60 * 60 * 1000);
  if (daysLeft <= 14 && project.progressRate < 70) return 'at_risk';
  return 'on_track';
}

export function healthBarClass(health: ProjectHealth): string {
  switch (health) {
    case 'completed':
      return 'bg-emerald-500';
    case 'on_track':
      return 'bg-blue-500';
    case 'at_risk':
      return 'bg-amber-500';
    case 'delayed':
      return 'bg-rose-500';
    default:
      return 'bg-slate-400';
  }
}

export function listRiskProjectIds(
  projects: readonly PortfolioProject[],
  onDate?: Date,
): string[] {
  return projects
    .filter((p) => {
      const h = classifyProjectHealth(p, onDate);
      return h === 'delayed' || h === 'at_risk';
    })
    .map((p) => p.id);
}

export function computeManagerKpis(
  objectives: readonly ManagerObjectiveRef[],
  projects: readonly PortfolioProject[],
  opts: {
    viewerUserId: string;
    teamUserIds: readonly string[];
    missingMonthlyProjectIds: readonly string[];
    cycleGoalsLocked?: boolean;
    /** 전월 팀 평균(없으면 0) */
    priorTeamAverageProgress?: number;
  },
): ManagerKpiModel {
  const teamObjectives = objectives.filter(
    (o) => o.ownerId && opts.teamUserIds.includes(o.ownerId),
  );
  const teamAvg =
    teamObjectives.length === 0
      ? 0
      : Math.round(
          teamObjectives.reduce((s, o) => s + o.progressRate, 0) / teamObjectives.length,
        );
  const prior = opts.priorTeamAverageProgress ?? teamAvg;
  const delta = teamAvg - prior;
  const deltaLabel =
    delta === 0 ? '전월 동일' : delta > 0 ? `전월 대비 +${delta}%p` : `전월 대비 ${delta}%p`;

  const owners = new Set(opts.teamUserIds.filter((id) => id !== opts.viewerUserId));
  const readyOwners = new Set<string>();
  const incompleteNames: string[] = [];

  for (const uid of owners) {
    const owned = objectives.filter((o) => o.ownerId === uid);
    const name = owned[0]?.ownerName ?? objectives.find((o) => o.ownerId === uid)?.ownerName ?? uid;
    if (owned.length === 0) {
      incompleteNames.push(name);
      continue;
    }
    const allApproved = owned.every((o) =>
      ['approved', 'in_progress', 'completed'].includes(o.status),
    );
    if (allApproved) readyOwners.add(uid);
    else incompleteNames.push(owned[0]!.ownerName);
  }

  const teamSize = owners.size || opts.teamUserIds.length;
  const goalSetupRatioLabel =
    teamSize === 0 ? '0/0명' : `${readyOwners.size}/${teamSize}명 완료`;

  const riskProjectCount = listRiskProjectIds(projects).length;

  const teamProjects = projects.filter((p) => p.ownerId && opts.teamUserIds.includes(p.ownerId));
  const missingSet = new Set(opts.missingMonthlyProjectIds);
  const checkinPendingCount = teamProjects.filter((p) => missingSet.has(p.id)).length;

  const approvalPendingCount = objectives.filter(
    (o) => o.ownerId && opts.teamUserIds.includes(o.ownerId) && o.status === 'submitted',
  ).length;

  const lockRatio = computeMboLockRatioLabel(
    objectives,
    opts.teamUserIds,
    opts.cycleGoalsLocked ?? false,
  );

  const checkinMissingMemberCount = countMembersMissingCheckin(
    teamProjects,
    opts.missingMonthlyProjectIds,
    opts.teamUserIds,
  );

  return {
    teamAverageProgress: teamAvg,
    teamProgressDeltaLabel: deltaLabel,
    goalSetupRatioLabel,
    goalSetupIncompleteNames: incompleteNames.slice(0, 8),
    mboLockRatioLabel: lockRatio.label,
    riskProjectCount,
    checkinPendingCount,
    checkinMissingMemberCount,
    approvalPendingCount,
  };
}

export function buildTeamMemberChips(
  objectives: readonly ManagerObjectiveRef[],
  projects: readonly PortfolioProject[],
  members: readonly { userId: string; displayName: string }[],
  opts: {
    viewerUserId: string;
    teamUserIds: readonly string[];
    missingMonthlyProjectIds: readonly string[];
    cycleGoalsLocked?: boolean;
  },
): TeamMemberChipModel[] {
  const missing = new Set(opts.missingMonthlyProjectIds);
  const ordered = [...members]
    .filter((m) => opts.teamUserIds.includes(m.userId))
    .sort((a, b) => {
      if (a.userId === opts.viewerUserId) return -1;
      if (b.userId === opts.viewerUserId) return 1;
      return a.displayName.localeCompare(b.displayName, 'ko');
    });

  return ordered.map((m) => {
    const owned = objectives.filter((o) => o.ownerId === m.userId);
    const avg =
      owned.length === 0
        ? 0
        : Math.round(owned.reduce((s, o) => s + o.progressRate, 0) / owned.length);
    const weightValid = validateMboObjectiveWeights(owned).valid;
    const ownedProjects = projects.filter((p) => p.ownerId === m.userId);
    const checkinOk =
      ownedProjects.length === 0 || ownedProjects.every((p) => !missing.has(p.id));
    const pendingApproval = owned.some((o) => o.status === 'submitted');
    const mboLocked = isMemberMboLocked(owned, opts.cycleGoalsLocked ?? false);

    return {
      userId: m.userId,
      displayName: m.displayName,
      averageProgress: avg,
      objectiveCount: owned.length,
      weightValid,
      checkinOk,
      pendingApproval,
      mboLocked,
    };
  });
}
