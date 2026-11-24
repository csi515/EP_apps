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

export type AlignmentSlot = 'company' | 'department' | 'mine';

export type AlignmentContext = {
  /** 스트립 미리보기용 대표 1건 */
  company: OrgAlignedObjective | null;
  department: OrgAlignedObjective | null;
  mine: OrgAlignedObjective | null;
  /** 슬롯 클릭 시 보드에 펼칠 전체 목록 */
  companies: OrgAlignedObjective[];
  departments: OrgAlignedObjective[];
  mines: OrgAlignedObjective[];
  companyCount: number;
  departmentCount: number;
  mineCount: number;
};

function sortByTitle(list: OrgAlignedObjective[]): OrgAlignedObjective[] {
  return [...list].sort((a, b) => a.title.localeCompare(b.title, 'ko'));
}

/**
 * 열람 가능 목표 중 전사·내 조직·내 KPI 요약.
 * departmentId 매칭 우선, 없으면 departmentName.
 */
export function resolveAlignmentContext(input: {
  visibleObjectives: readonly OrgAlignedObjective[];
  viewerUserId: string | null | undefined;
  viewerDepartmentId?: string | null;
  viewerDepartmentName?: string | null;
}): AlignmentContext {
  const active = input.visibleObjectives;
  const companies = sortByTitle(active.filter((o) => o.level === 'company'));
  const company = companies[0] ?? null;

  const allDept = active.filter((o) => o.level === 'department');
  let departments: OrgAlignedObjective[] = [];
  if (input.viewerDepartmentId) {
    departments = allDept.filter((o) => o.departmentId === input.viewerDepartmentId);
  }
  if (departments.length === 0 && input.viewerDepartmentName) {
    const name = input.viewerDepartmentName.trim();
    departments = allDept.filter((o) => (o.departmentName || '').trim() === name);
  }
  // 내 부서 매칭이 없으면 열람 가능한 조직 목표 전체를 슬롯에 둔다
  if (departments.length === 0) {
    departments = allDept;
  }
  departments = sortByTitle(departments);
  const department = departments[0] ?? null;

  const ownedByViewer = active.filter(
    (o) => o.ownerId && input.viewerUserId && o.ownerId === input.viewerUserId
  );
  const mineIndividuals = sortByTitle(
    ownedByViewer.filter((o) => o.level === 'individual')
  );
  // 리더 등: 개인 KPI가 없으면 본인 소유 조직단위 목표로 폴백
  const mineDeptFallback = sortByTitle(
    ownedByViewer.filter((o) => o.level === 'department')
  );
  const mines = mineIndividuals.length > 0 ? mineIndividuals : mineDeptFallback;
  const mine = mines[0] ?? null;

  return {
    company,
    department,
    mine,
    companies,
    departments,
    mines,
    companyCount: companies.length,
    departmentCount: departments.length,
    mineCount: mines.length,
  };
}

/** 정렬 슬롯 → 보드용 플랫 행(깊이 0, 한눈에 목록) */
export function listAlignmentSlotRows(
  context: AlignmentContext,
  slot: AlignmentSlot
): OrgAlignedFlatRow[] {
  const list =
    slot === 'company'
      ? context.companies
      : slot === 'department'
        ? context.departments
        : context.mines;
  return list.map((o) => ({ ...o, depth: 0 }));
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
