import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { showToast } from '@/shared/feedback/uiFeedback';
import type { ProjectCategory } from '../domain/projectCategoryEngine';
import type { PortfolioProject } from '../domain/projectPortfolioEngine';
import {
  buildPlanActualMatrixRows,
  filterMatrixProjects,
  type MatrixProjectInput,
  type MboProjectMonthCellModel,
  type MonthCellStatus,
} from '../domain/mboPlanActualMatrixEngine';
import { MboService, type MboProjectMonthCellRow } from '../services/mboService';
import { MboPlanActualMatrixGrid } from './MboPlanActualMatrixGrid';
import { MBO_COPY } from './mboUiCopy';

type Props = {
  organizationId: string;
  year: number;
  onYearChange: (year: number) => void;
  projects: PortfolioProject[];
  categories: ProjectCategory[];
  viewerUserId: string;
  editableProjectIds: ReadonlySet<string>;
  selectedOwnerIds?: string[];
};

function mapCellRow(row: MboProjectMonthCellRow): MboProjectMonthCellModel {
  return {
    id: row.id,
    projectId: row.project_id,
    year: row.year,
    month: row.month,
    planText: row.plan_text,
    planStatus: row.plan_status as MonthCellStatus,
    actualText: row.actual_text,
    actualStatus: row.actual_status as MonthCellStatus,
  };
}

function toMatrixProject(p: PortfolioProject): MatrixProjectInput {
  return {
    id: p.id,
    title: p.title,
    ownerId: p.ownerId,
    ownerName: p.ownerName,
    categoryId: p.categoryId ?? null,
    categoryLabel: p.categoryLabel ?? null,
    wbsCode: p.wbsCode ?? null,
    wbsSeq: p.wbsSeq ?? null,
    startDate: p.startDate,
    targetDate: p.targetDate,
  };
}

export function MboPlanActualMatrixView({
  organizationId,
  year,
  onYearChange,
  projects,
  categories,
  viewerUserId,
  editableProjectIds,
  selectedOwnerIds = [],
}: Props) {
  const [cells, setCells] = useState<MboProjectMonthCellModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [hidePlanRows, setHidePlanRows] = useState(false);

  const projectIdsKey = useMemo(() => projects.map((p) => p.id).join(','), [projects]);

  const reload = useCallback(async () => {
    const projectIds = projectIdsKey ? projectIdsKey.split(',').filter(Boolean) : [];
    if (!organizationId || projectIds.length === 0) {
      setCells([]);
      return;
    }
    setLoading(true);
    try {
      await MboService.ensureMonthCellsForProjects(organizationId, projectIds);
      const rows = await MboService.listMonthCells(organizationId, {
        year,
        projectIds,
      });
      setCells(rows.map(mapCellRow));
    } catch {
      showToast(MBO_COPY.matrixLoadFailed, 'error');
    } finally {
      setLoading(false);
    }
  }, [organizationId, projectIdsKey, year]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const matrixProjects = useMemo(() => {
    const inputs = projects.map(toMatrixProject);
    return filterMatrixProjects(inputs, cells, {
      ownerIds: selectedOwnerIds,
      categoryIds: categoryFilter ? [categoryFilter] : undefined,
      issuesOnly,
    });
  }, [projects, cells, selectedOwnerIds, categoryFilter, issuesOnly]);

  const rows = useMemo(
    () => buildPlanActualMatrixRows(matrixProjects, cells, year, { hidePlanRows }),
    [matrixProjects, cells, year, hidePlanRows],
  );

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1];
  }, []);

  const patchLocalCell = (
    projectId: string,
    month: number,
    patch: Partial<MboProjectMonthCellModel>,
  ) => {
    setCells((prev) => {
      const idx = prev.findIndex(
        (c) => c.projectId === projectId && c.year === year && c.month === month,
      );
      if (idx < 0) {
        return [
          ...prev,
          {
            id: `tmp-${projectId}-${year}-${month}`,
            projectId,
            year,
            month,
            planText: null,
            planStatus: 'normal',
            actualText: null,
            actualStatus: 'normal',
            ...patch,
          },
        ];
      }
      const next = [...prev];
      next[idx] = { ...next[idx]!, ...patch };
      return next;
    });
  };

  const handleCommitText = async (input: {
    projectId: string;
    month: number;
    kind: 'plan' | 'actual';
    value: string;
  }) => {
    if (!editableProjectIds.has(input.projectId)) return;
    const field = input.kind === 'plan' ? 'plan_text' : 'actual_text';
    const localPatch =
      input.kind === 'plan'
        ? { planText: input.value || null }
        : { actualText: input.value || null };
    patchLocalCell(input.projectId, input.month, localPatch);
    try {
      const row = await MboService.upsertMonthCellField(organizationId, {
        projectId: input.projectId,
        year,
        month: input.month,
        field,
        value: input.value || null,
        updatedBy: viewerUserId || null,
      });
      patchLocalCell(input.projectId, input.month, mapCellRow(row));
    } catch {
      showToast(MBO_COPY.matrixSaveFailed, 'error');
      void reload();
    }
  };

  const handleChangeStatus = async (input: {
    projectId: string;
    month: number;
    kind: 'plan' | 'actual';
    status: MonthCellStatus;
  }) => {
    if (!editableProjectIds.has(input.projectId)) return;
    const field = input.kind === 'plan' ? 'plan_status' : 'actual_status';
    const localPatch =
      input.kind === 'plan'
        ? { planStatus: input.status }
        : { actualStatus: input.status };
    patchLocalCell(input.projectId, input.month, localPatch);
    try {
      const row = await MboService.upsertMonthCellField(organizationId, {
        projectId: input.projectId,
        year,
        month: input.month,
        field,
        value: input.status,
        updatedBy: viewerUserId || null,
      });
      patchLocalCell(input.projectId, input.month, mapCellRow(row));
    } catch {
      showToast(MBO_COPY.matrixSaveFailed, 'error');
      void reload();
    }
  };

  const activeCategories = categories.filter((c) => c.isActive !== false);

  return (
    <div className="space-y-2" data-testid="mbo-plan-actual-matrix-view">
      <div className="flex flex-wrap items-end gap-2 border border-slate-200 bg-white p-2.5">
        <label className="flex flex-col gap-0.5 text-[11px] font-semibold text-slate-500">
          {MBO_COPY.matrixYearLabel}
          <select
            className="h-9 min-w-[5.5rem] border border-slate-200 bg-white px-2 text-sm text-slate-800"
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5 text-[11px] font-semibold text-slate-500">
          {MBO_COPY.matrixCategoryFilter}
          <select
            className="h-9 min-w-[7rem] border border-slate-200 bg-white px-2 text-sm text-slate-800"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">{MBO_COPY.matrixFilterAll}</option>
            {activeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex h-9 items-center gap-1.5 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={issuesOnly}
            onChange={(e) => setIssuesOnly(e.target.checked)}
          />
          {MBO_COPY.matrixIssuesOnly}
        </label>
        <label className="flex h-9 items-center gap-1.5 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={hidePlanRows}
            onChange={(e) => setHidePlanRows(e.target.checked)}
          />
          {MBO_COPY.matrixHidePlanRows}
        </label>
        {loading ? (
          <span className="ml-auto text-[11px] text-slate-400">…</span>
        ) : null}
      </div>

      <MboPlanActualMatrixGrid
        year={year}
        rows={rows}
        canEditProject={(id) => editableProjectIds.has(id)}
        onCommitText={(input) => void handleCommitText(input)}
        onChangeStatus={(input) => void handleChangeStatus(input)}
      />
    </div>
  );
}
