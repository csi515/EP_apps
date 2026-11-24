/**
 * MBO Plan vs Actual 월간 매트릭스 조립 엔진 (순수 함수)
 */

import { listPeriodYmBetween, parsePeriodYm } from './mboMonthlyCheckin';

export type MonthCellStatus = 'normal' | 'highlighted' | 'changed_or_delayed';

export const MONTH_CELL_STATUSES: readonly MonthCellStatus[] = [
  'normal',
  'highlighted',
  'changed_or_delayed',
] as const;

export type MboProjectMonthCellModel = {
  id: string;
  projectId: string;
  year: number;
  month: number;
  planText: string | null;
  planStatus: MonthCellStatus;
  actualText: string | null;
  actualStatus: MonthCellStatus;
};

export type MatrixProjectInput = {
  id: string;
  title: string;
  ownerId: string | null;
  ownerName: string;
  categoryId?: string | null;
  categoryLabel?: string | null;
  wbsCode?: string | null;
  wbsSeq?: number | null;
  startDate: string;
  targetDate: string;
  createdAt?: string | null;
};

export type MatrixRowKind = 'plan' | 'actual';

export type MatrixDualRow = {
  projectId: string;
  title: string;
  ownerId: string | null;
  ownerName: string;
  categoryId: string | null;
  categoryLabel: string;
  wbsCode: string;
  wbsSeq: number | null;
  kind: MatrixRowKind;
  /** 대분류 라벨을 이 행에만 표시 (그룹 첫 행) */
  showCategoryLabel: boolean;
  /** 중분류(wbs) 라벨을 이 행에만 표시 */
  showWbsLabel: boolean;
  /** 선택 연도 1~12 — 구간 밖이면 null */
  cellsByMonth: Record<number, MboProjectMonthCellModel | null>;
  /** 해당 연도에서 편집 가능한 월 */
  editableMonths: ReadonlySet<number>;
};

export type MonthCellEnsureExisting = {
  id: string;
  year: number;
  month: number;
  planText: string | null;
  planStatus: MonthCellStatus;
  actualText: string | null;
  actualStatus: MonthCellStatus;
};

export function isMonthCellContentEmpty(cell: {
  planText: string | null;
  planStatus: MonthCellStatus;
  actualText: string | null;
  actualStatus: MonthCellStatus;
}): boolean {
  const planEmpty = !cell.planText?.trim();
  const actualEmpty = !cell.actualText?.trim();
  return (
    planEmpty &&
    actualEmpty &&
    cell.planStatus === 'normal' &&
    cell.actualStatus === 'normal'
  );
}

export function ymKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * 기간 기준 선생성/축소 계획.
 * - 구간 안 미존재 월 → 생성
 * - 구간 밖 + 비어 있는 셀만 삭제 (텍스트/강조 있는 셀은 보존)
 */
export function planMonthCellEnsure(
  startDate: string,
  targetDate: string,
  existing: MonthCellEnsureExisting[],
): { toCreate: Array<{ year: number; month: number }>; toDeleteIds: string[] } {
  const period = new Set(listPeriodYmBetween(startDate, targetDate));
  const byYm = new Map<string, MonthCellEnsureExisting>();
  for (const cell of existing) {
    byYm.set(ymKey(cell.year, cell.month), cell);
  }

  const toCreate: Array<{ year: number; month: number }> = [];
  for (const ym of period) {
    if (byYm.has(ym)) continue;
    const parsed = parsePeriodYm(ym);
    if (!parsed) continue;
    toCreate.push(parsed);
  }

  const toDeleteIds: string[] = [];
  for (const cell of existing) {
    const key = ymKey(cell.year, cell.month);
    if (period.has(key)) continue;
    if (isMonthCellContentEmpty(cell)) {
      toDeleteIds.push(cell.id);
    }
  }

  return { toCreate, toDeleteIds };
}

function sortMatrixProjects(projects: MatrixProjectInput[]): MatrixProjectInput[] {
  return [...projects].sort((a, b) => {
    const catA = (a.categoryLabel ?? '').localeCompare(b.categoryLabel ?? '', 'ko');
    if (catA !== 0) return catA;
    const wbsA = (a.wbsCode ?? '').localeCompare(b.wbsCode ?? '', 'ko');
    if (wbsA !== 0) return wbsA;
    const seqA = a.wbsSeq ?? Number.MAX_SAFE_INTEGER;
    const seqB = b.wbsSeq ?? Number.MAX_SAFE_INTEGER;
    if (seqA !== seqB) return seqA - seqB;
    const titleCmp = a.title.localeCompare(b.title, 'ko');
    if (titleCmp !== 0) return titleCmp;
    return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
  });
}

export type MatrixFilterOptions = {
  ownerIds?: string[];
  categoryIds?: string[];
  /** changed_or_delayed 셀이 있는 과제만 */
  issuesOnly?: boolean;
};

export function projectHasIssueCell(
  projectId: string,
  cells: MboProjectMonthCellModel[],
): boolean {
  return cells.some(
    (c) =>
      c.projectId === projectId &&
      (c.planStatus === 'changed_or_delayed' || c.actualStatus === 'changed_or_delayed'),
  );
}

export function filterMatrixProjects(
  projects: MatrixProjectInput[],
  cells: MboProjectMonthCellModel[],
  options: MatrixFilterOptions = {},
): MatrixProjectInput[] {
  let list = projects;
  if (options.ownerIds && options.ownerIds.length > 0) {
    const pick = new Set(options.ownerIds);
    list = list.filter((p) => Boolean(p.ownerId && pick.has(p.ownerId)));
  }
  if (options.categoryIds && options.categoryIds.length > 0) {
    const pick = new Set(options.categoryIds);
    list = list.filter((p) => Boolean(p.categoryId && pick.has(p.categoryId)));
  }
  if (options.issuesOnly) {
    list = list.filter((p) => projectHasIssueCell(p.id, cells));
  }
  return list;
}

/**
 * 업무 1건 = 계획 행 + 실적 행. hidePlanRows 시 실적만.
 */
export function buildPlanActualMatrixRows(
  projects: MatrixProjectInput[],
  cells: MboProjectMonthCellModel[],
  year: number,
  options: { hidePlanRows?: boolean } = {},
): MatrixDualRow[] {
  const sorted = sortMatrixProjects(projects);
  const cellsByProject = new Map<string, Map<number, MboProjectMonthCellModel>>();
  for (const cell of cells) {
    if (cell.year !== year) continue;
    let byMonth = cellsByProject.get(cell.projectId);
    if (!byMonth) {
      byMonth = new Map();
      cellsByProject.set(cell.projectId, byMonth);
    }
    byMonth.set(cell.month, cell);
  }

  const rows: MatrixDualRow[] = [];
  let prevCategory = '';
  let prevWbs = '';

  for (const project of sorted) {
    const periodYms = listPeriodYmBetween(project.startDate, project.targetDate);
    const editableMonths = new Set<number>();
    for (const ym of periodYms) {
      const parsed = parsePeriodYm(ym);
      if (parsed && parsed.year === year) editableMonths.add(parsed.month);
    }

    const byMonth = cellsByProject.get(project.id) ?? new Map();
    const cellsByMonth: Record<number, MboProjectMonthCellModel | null> = {};
    for (let m = 1; m <= 12; m += 1) {
      if (!editableMonths.has(m) && !byMonth.has(m)) {
        cellsByMonth[m] = null;
      } else {
        cellsByMonth[m] = byMonth.get(m) ?? null;
      }
    }

    const categoryLabel = project.categoryLabel?.trim() || '미분류';
    const wbsCode = project.wbsCode?.trim() || '—';
    const showCategoryLabel = categoryLabel !== prevCategory;
    const showWbsLabel = showCategoryLabel || wbsCode !== prevWbs;
    prevCategory = categoryLabel;
    prevWbs = wbsCode;

    const base = {
      projectId: project.id,
      title: project.title,
      ownerId: project.ownerId,
      ownerName: project.ownerName,
      categoryId: project.categoryId ?? null,
      categoryLabel,
      wbsCode,
      wbsSeq: project.wbsSeq ?? null,
      cellsByMonth,
      editableMonths,
    };

    if (!options.hidePlanRows) {
      rows.push({
        ...base,
        kind: 'plan',
        showCategoryLabel,
        showWbsLabel,
      });
      rows.push({
        ...base,
        kind: 'actual',
        showCategoryLabel: false,
        showWbsLabel: false,
      });
    } else {
      rows.push({
        ...base,
        kind: 'actual',
        showCategoryLabel,
        showWbsLabel,
      });
    }
  }

  return rows;
}
