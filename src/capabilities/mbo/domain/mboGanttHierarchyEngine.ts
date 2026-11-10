import type { MboStatus } from './mboEngine';
import type { PortfolioProject } from './projectPortfolioEngine';
import { resolveMboGoalLockView, type MboGoalLockStatus } from './mboTwoTierLockEngine';

export type HierarchyGanttRow =
  | {
      kind: 'objective';
      id: string;
      title: string;
      ownerName: string;
      ownerId: string | null;
      status: MboStatus;
      startDate: string;
      targetDate: string;
      progressRate: number;
      weight: number;
      successCriteria?: string;
      lockStatus: MboGoalLockStatus;
      isStrictLocked: boolean;
      managerOverrideActive?: boolean;
    }
  | {
      kind: 'project';
      id: string;
      objectiveId: string | null;
      title: string;
      ownerName: string;
      ownerId: string | null;
      status: MboStatus;
      startDate: string;
      targetDate: string;
      progressRate: number;
      weight?: number;
    };

export function buildHierarchyGanttRows(
  objectives: readonly {
    id: string;
    title: string;
    ownerId: string | null;
    ownerName: string;
    status: MboStatus;
    startDate: string;
    targetDate: string;
    progressRate: number;
    weight: number;
  }[],
  projects: readonly PortfolioProject[],
  opts?: {
    ownerUserIds?: readonly string[];
    objectiveIds?: readonly string[];
    riskOnly?: boolean;
    riskProjectIds?: readonly string[];
    cycleGoalsLocked?: boolean;
    canOverrideForOwner?: (ownerId: string | null | undefined) => boolean;
  },
): HierarchyGanttRow[] {
  const cycleLocked = opts?.cycleGoalsLocked ?? false;
  let proj = [...projects];
  if (opts?.ownerUserIds?.length) {
    const set = new Set(opts.ownerUserIds);
    proj = proj.filter((p) => p.ownerId && set.has(p.ownerId));
  }
  if (opts?.riskOnly && opts.riskProjectIds?.length) {
    const risks = new Set(opts.riskProjectIds);
    proj = proj.filter((p) => risks.has(p.id));
  }

  const objectiveIds = new Set(proj.map((p) => p.objectiveId).filter(Boolean) as string[]);
  const objs = objectives.filter((o) => objectiveIds.has(o.id) || !proj.some((p) => p.objectiveId === o.id));
  const objById = new Map(objectives.map((o) => [o.id, o]));

  const rows: HierarchyGanttRow[] = [];
  const usedProjectIds = new Set<string>();

  for (const objective of objs) {
    if (opts?.objectiveIds?.length && !opts.objectiveIds.includes(objective.id)) continue;
    const children = proj.filter((p) => p.objectiveId === objective.id);
    if (children.length === 0) continue;

    const canOverride = opts?.canOverrideForOwner?.(objective.ownerId) ?? false;
    const lockView = resolveMboGoalLockView(objective.status, cycleLocked, canOverride);
    rows.push({
      kind: 'objective',
      id: objective.id,
      title: objective.title,
      ownerName: objective.ownerName,
      ownerId: objective.ownerId,
      status: objective.status,
      startDate: objective.startDate,
      targetDate: objective.targetDate,
      progressRate: objective.progressRate,
      weight: objective.weight,
      lockStatus: lockView.lockStatus,
      isStrictLocked: lockView.isStrictLocked,
      managerOverrideActive: lockView.managerOverrideActive,
    });

    for (const p of children) {
      usedProjectIds.add(p.id);
      rows.push({
        kind: 'project',
        id: p.id,
        objectiveId: p.objectiveId ?? null,
        title: p.title,
        ownerName: p.ownerName,
        ownerId: p.ownerId,
        status: p.status,
        startDate: p.startDate,
        targetDate: p.targetDate,
        progressRate: p.progressRate,
      });
    }
  }

  for (const p of proj) {
    if (usedProjectIds.has(p.id)) continue;
    rows.push({
      kind: 'project',
      id: p.id,
      objectiveId: p.objectiveId ?? null,
      title: p.title,
      ownerName: p.ownerName,
      ownerId: p.ownerId,
      status: p.status,
      startDate: p.startDate,
      targetDate: p.targetDate,
      progressRate: p.progressRate,
    });
  }

  return rows;
}
