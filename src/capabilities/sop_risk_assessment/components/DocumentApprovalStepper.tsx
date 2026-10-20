import React from 'react';
import {
  formatApprovalStepLabel,
  type ApprovalStepState,
} from '../domain/approvalEngine';

type Props = {
  steps: ApprovalStepState[];
};

export const DocumentApprovalStepper: React.FC<Props> = ({ steps }) => {
  const ordered = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);

  if (ordered.length === 0) {
    return (
      <p className="text-sm text-slate-500">결재선이 아직 배정되지 않았습니다.</p>
    );
  }

  return (
    <nav aria-label="결재 진행 타임라인" className="w-full overflow-x-auto">
      <ol className="flex min-w-max items-center gap-2 py-2">
        {ordered.map((step, index) => (
          <React.Fragment key={`${step.stepOrder}-${step.assigneeId}`}>
            <li
              className={[
                'rounded-lg border px-3 py-2 text-sm font-semibold',
                step.actionStatus === 'APPROVED'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : step.actionStatus === 'REJECTED'
                    ? 'border-rose-300 bg-rose-50 text-rose-800'
                    : 'border-amber-300 bg-amber-50 text-amber-900',
              ].join(' ')}
            >
              {formatApprovalStepLabel(step)}
            </li>
            {index < ordered.length - 1 ? (
              <li aria-hidden className="text-slate-400 font-bold">
                ➔
              </li>
            ) : null}
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
};
