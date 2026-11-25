import React from 'react';
import type {
  MatrixDualRow,
  MonthCellStatus,
  MboProjectMonthCellModel,
} from '../domain/mboPlanActualMatrixEngine';
import { MboPlanActualMatrixCell } from './MboPlanActualMatrixCell';
import { MBO_COPY } from './mboUiCopy';

type Props = {
  year: number;
  rows: MatrixDualRow[];
  canEditProject: (projectId: string) => boolean;
  onCommitText: (input: {
    projectId: string;
    month: number;
    kind: 'plan' | 'actual';
    value: string;
  }) => void;
  onChangeStatus: (input: {
    projectId: string;
    month: number;
    kind: 'plan' | 'actual';
    status: MonthCellStatus;
  }) => void;
};

function cellText(
  cell: MboProjectMonthCellModel | null | undefined,
  kind: 'plan' | 'actual',
): string | null {
  if (!cell) return null;
  return kind === 'plan' ? cell.planText : cell.actualText;
}

function cellStatus(
  cell: MboProjectMonthCellModel | null | undefined,
  kind: 'plan' | 'actual',
): MonthCellStatus {
  if (!cell) return 'normal';
  return kind === 'plan' ? cell.planStatus : cell.actualStatus;
}

export function MboPlanActualMatrixGrid({
  year,
  rows,
  canEditProject,
  onCommitText,
  onChangeStatus,
}: Props) {
  if (rows.length === 0) {
    return (
      <p className="border border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-500">
        {MBO_COPY.matrixEmpty}
      </p>
    );
  }

  return (
    <div className="overflow-auto border border-slate-200 bg-white" data-testid="mbo-plan-actual-matrix">
      <table className="min-w-max border-collapse text-left text-[11px] [content-visibility:auto]">
        <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="sticky left-0 z-20 min-w-[4.5rem] border border-slate-200 bg-slate-50 px-1.5 py-1.5">
              {MBO_COPY.matrixColCategory}
            </th>
            <th className="sticky left-[4.5rem] z-20 min-w-[8rem] border border-slate-200 bg-slate-50 px-1.5 py-1.5">
              {MBO_COPY.matrixColTitle}
            </th>
            <th className="sticky left-[12.5rem] z-20 min-w-[3.5rem] border border-slate-200 bg-slate-50 px-1.5 py-1.5">
              {MBO_COPY.matrixColOwner}
            </th>
            <th className="min-w-[2.5rem] border border-slate-200 px-1 py-1.5"> </th>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <th key={month} className="min-w-[5.5rem] border border-slate-200 px-1 py-1.5 text-center">
                {MBO_COPY.matrixMonth(month)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowTint = row.kind === 'plan' ? 'bg-sky-50/40' : 'bg-emerald-50/40';
            const editable = canEditProject(row.projectId);
            return (
              <tr key={`${row.projectId}-${row.kind}`} className={rowTint}>
                <td className="sticky left-0 z-[1] border border-slate-100 bg-inherit px-1.5 py-0.5 font-medium text-slate-700">
                  {row.showCategoryLabel ? row.categoryLabel : ''}
                </td>
                <td className="sticky left-[4.5rem] z-[1] max-w-[8rem] truncate border border-slate-100 bg-inherit px-1.5 py-0.5 font-medium text-slate-800">
                  {row.kind === 'plan' ? row.title : ''}
                </td>
                <td className="sticky left-[12.5rem] z-[1] border border-slate-100 bg-inherit px-1.5 py-0.5 text-slate-600">
                  {row.kind === 'plan' ? row.ownerName : ''}
                </td>
                <td className="border border-slate-100 px-1 py-0.5 text-[10px] font-semibold text-slate-500">
                  {row.kind === 'plan' ? MBO_COPY.matrixRowPlan : MBO_COPY.matrixRowActual}
                </td>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                  const inPeriod = row.editableMonths.has(month);
                  const cell = row.cellsByMonth[month];
                  const outOfRange = !inPeriod;
                  return (
                    <MboPlanActualMatrixCell
                      key={`${row.projectId}-${row.kind}-${year}-${month}`}
                      editable={editable && inPeriod}
                      outOfRange={outOfRange}
                      text={cellText(cell, row.kind)}
                      status={cellStatus(cell, row.kind)}
                      onCommitText={(value) =>
                        onCommitText({
                          projectId: row.projectId,
                          month,
                          kind: row.kind,
                          value,
                        })
                      }
                      onChangeStatus={(status) =>
                        onChangeStatus({
                          projectId: row.projectId,
                          month,
                          kind: row.kind,
                          status,
                        })
                      }
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
