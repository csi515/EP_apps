/**
 * 조직 정렬 목표 트리 — parent_id 전역 계층 (담당자별이 아님)
 */
import type { MboLevel } from './mboEngine';
import { MBO_LEVEL_RANK } from './mboGoalHierarchy';

export type OrgAlignedObjective = {
  id: string;
  parentId: string | null;
  level: MboLevel;
  title: string;
  ownerId: string | null;
  ownerName: string;
  departmentName?: string | null;
  departmentId?: string | null;
  progressRate: number;
  weight: number;
  status: string;
};

export type OrgAlignedFlatRow = OrgAlignedObjective & { depth: number };

/** parent_id 기준 전역 트리로 펼친 플랫 목록 */
export function buildOrgAlignedObjectiveTree(
  objectives: readonly OrgAlignedObjective[]
): OrgAlignedFlatRow[] {
  const ids = new Set(objectives.map((o) => o.id));
  const roots = objectives
    .filter((o) => !o.parentId || !ids.has(o.parentId))
    .sort(
      (a, b) =>
        MBO_LEVEL_RANK[a.level] - MBO_LEVEL_RANK[b.level] ||
        a.title.localeCompare(b.title, 'ko')
    );

  const out: OrgAlignedFlatRow[] = [];
  const walk = (node: OrgAlignedObjective, depth: number) => {
    out.push({ ...node, depth });
    const children = objectives
      .filter((c) => c.parentId === node.id)
      .sort(
        (a, b) =>
          MBO_LEVEL_RANK[a.level] - MBO_LEVEL_RANK[b.level] ||
          a.title.localeCompare(b.title, 'ko')
      );
    for (const child of children) walk(child, depth + 1);
  };
  for (const root of roots) walk(root, 0);

  const attached = new Set(out.map((o) => o.id));
  for (const o of objectives) {
    if (!attached.has(o.id)) out.push({ ...o, depth: 0 });
  }
  return out;
}

export type AlignmentContext = {
  company: OrgAlignedObjective | null;
  department: OrgAlignedObjective | null;
  mine: OrgAlignedObjective | null;
};

/**
 * 열람 가능 목표 중 전사·내 조직·내 KPI 요약.
 * departmentPathPrefix: 내 부서 path (예: /hq/rnd/) — departmentId 매칭 우선, 없으면 departmentName.
 */
export function resolveAlignmentContext(input: {
  visibleObjectives: readonly OrgAlignedObjective[];
  viewerUserId: string | null | undefined;
  viewerDepartmentId?: string | null;
  viewerDepartmentName?: string | null;
}): AlignmentContext {
  const active = input.visibleObjectives;
  const company =
    active
      .filter((o) => o.level === 'company')
      .sort((a, b) => a.title.localeCompare(b.title, 'ko'))[0] ?? null;

  const deptCandidates = active.filter((o) => o.level === 'department');
  let department: OrgAlignedObjective | null = null;
  if (input.viewerDepartmentId) {
    department =
      deptCandidates.find((o) => o.departmentId === input.viewerDepartmentId) ?? null;
  }
  if (!department && input.viewerDepartmentName) {
    const name = input.viewerDepartmentName.trim();
    department =
      deptCandidates.find((o) => (o.departmentName || '').trim() === name) ?? null;
  }
  if (!department) {
    department = deptCandidates[0] ?? null;
  }

  const ownedByViewer = active.filter(
    (o) => o.ownerId && input.viewerUserId && o.ownerId === input.viewerUserId
  );
  const mineIndividual =
    ownedByViewer
      .filter((o) => o.level === 'individual')
      .sort((a, b) => a.title.localeCompare(b.title, 'ko'))[0] ?? null;
  // 리더 등: 개인 KPI가 없으면 본인 소유 조직단위 목표로 폴백
  const mineDeptFallback =
    ownedByViewer
      .filter((o) => o.level === 'department')
      .sort((a, b) => a.title.localeCompare(b.title, 'ko'))[0] ?? null;
  const mine = mineIndividual ?? mineDeptFallback;

  return { company, department, mine };
}

/** 매니저 팀 화면용 — 내가 관리하지 않는 상위(company 등) 열람 가능 목표 */
export function listUpstreamVisibleGoals(input: {
  visibleObjectives: readonly OrgAlignedObjective[];
  managedUserIds: readonly string[];
  viewerUserId: string | null | undefined;
}): OrgAlignedObjective[] {
  const managed = new Set(input.managedUserIds);
  if (input.viewerUserId) managed.add(input.viewerUserId);
  return input.visibleObjectives
    .filter((o) => o.level === 'company' || o.level === 'department')
    .filter((o) => !o.ownerId || !managed.has(o.ownerId))
    .sort(
      (a, b) =>
        MBO_LEVEL_RANK[a.level] - MBO_LEVEL_RANK[b.level] ||
        a.title.localeCompare(b.title, 'ko')
    );
}
