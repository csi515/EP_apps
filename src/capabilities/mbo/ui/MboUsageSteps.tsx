import React from 'react';
import { MBO_COPY } from './mboUiCopy';
import type { MboContentPanel } from '../hooks/useMboManagementWorkspaceState';

type Props = {
  contentPanel: MboContentPanel;
  hasGoals: boolean;
  onSelectSchedule: () => void;
  onCreateGoal: () => void;
  createDisabled?: boolean;
};

/** 빈 목표일 때 등록 → 실행 과제 순서만 안내 */
export function MboUsageSteps({
  contentPanel,
  hasGoals,
  onSelectSchedule,
  onCreateGoal,
  createDisabled = false,
}: Props) {
  const activeId = !hasGoals
    ? 'register'
    : contentPanel === 'schedule'
      ? 'schedule'
      : 'register';

  const steps = [
    {
      id: 'register' as const,
      label: MBO_COPY.workflowStepRegister,
      onClick: onCreateGoal,
      disabled: createDisabled,
    },
    {
      id: 'schedule' as const,
      label: MBO_COPY.workflowStepSchedule,
      onClick: onSelectSchedule,
      disabled: false,
    },
  ];

  return (
    <div className="space-y-1" data-testid="mbo-usage-steps">
      {!hasGoals ? (
        <p className="text-[11px] font-medium text-slate-500">{MBO_COPY.usageStepsFirstRunOnly}</p>
      ) : null}
      <nav
        className="flex flex-wrap items-stretch gap-1 border border-slate-200 bg-white"
        aria-label="사용 순서"
      >
        {steps.map((step, index) => {
          const active = step.id === activeId;
          return (
            <React.Fragment key={step.id}>
              {index > 0 ? (
                <span
                  className="hidden self-center px-0.5 text-[11px] font-medium text-slate-300 sm:inline"
                  aria-hidden
                >
                  →
                </span>
              ) : null}
              <button
                type="button"
                disabled={step.disabled}
                onClick={step.onClick}
                className={[
                  'flex min-h-11 min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left',
                  'enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50',
                  active ? 'bg-slate-50' : '',
                ].join(' ')}
                aria-current={active ? 'step' : undefined}
              >
                <span
                  className={[
                    'flex h-6 w-6 shrink-0 items-center justify-center text-[11px] font-semibold',
                    active
                      ? 'bg-slate-800 text-white'
                      : 'border border-slate-300 text-slate-600',
                  ].join(' ')}
                >
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-slate-900">
                    {step.label}
                  </span>
                  {active ? (
                    <span className="block text-[10px] font-medium text-slate-500">
                      {MBO_COPY.workflowActiveHint}
                    </span>
                  ) : null}
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
}
