import React, { useEffect, useState } from 'react';
import type { MboLevel } from '../domain/mboEngine';
import type { MboVisibilityType } from '../domain/mboVisibilityEngine';
import { levelLabelKo, type ExistingGoalRef, type GoalHierarchyActor } from '../domain/mboGoalHierarchy';
import type { ImmediateSuperiorResult } from '@/core/organizations/resolveImmediateSuperior';
import type { MboPickerMember } from '../services/mboOrgScopeService';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { MboImmediateSuperiorBar } from './MboImmediateSuperiorBar';
import {
  CreateStepAccess,
  CreateStepBasics,
  CreateStepHierarchy,
  type CreateStepSharedProps,
} from './MboCreateObjectiveSteps';
import { MBO_COPY } from './mboUiCopy';
import type { ObjectiveNode } from '../domain/mboObjectiveNode';

type Props = CreateStepSharedProps & {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  createBusy?: boolean;
  maxCreatableLevel: MboLevel;
  goalActor: GoalHierarchyActor;
  createGate: { allowed: boolean; reason?: string };
  immediateSuperior?: ImmediateSuperiorResult | null;
  eligibleParents: ExistingGoalRef[];
  objectives: ObjectiveNode[];
  selectedOwnerMember: MboPickerMember | null;
  newVisibility: MboVisibilityType;
};

type CreateStep = 1 | 2 | 3;

export const MboCreateObjectiveModal: React.FC<Props> = (props) => {
  const {
    open,
    onClose,
    onSubmit,
    createBusy = false,
    createGate,
    maxCreatableLevel,
    goalActor,
    immediateSuperior,
    newTitle,
  } = props;

  const [step, setStep] = useState<CreateStep>(1);
  const personalPath = maxCreatableLevel === 'individual';

  useEffect(() => {
    if (open) setStep(1);
  }, [open]);

  const submitBlocked = !createGate.allowed;
  const canSubmitFromStep1 = personalPath && step === 1;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={MBO_COPY.createGoalModal}
      maxWidth="lg"
      intent="form"
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-medium text-slate-500">
            {step}/3 ·{' '}
            {step === 1
              ? MBO_COPY.createStepBasics
              : step === 2
                ? MBO_COPY.createStepHierarchy
                : MBO_COPY.createStepAccess}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {submitBlocked ? (
              <p
                className="text-[11px] font-semibold text-amber-700"
                data-testid="mbo-create-gate-reason"
              >
                {createGate.reason ?? MBO_COPY.createGoalBlocked}
              </p>
            ) : null}
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
            {step > 1 ? (
              <Button variant="ghost" onClick={() => setStep((s) => (s === 3 ? 2 : 1))}>
                {MBO_COPY.createStepBack}
              </Button>
            ) : null}
            {step < 3 && !canSubmitFromStep1 ? (
              <Button
                variant="secondary"
                onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
                disabled={step === 1 && !newTitle.trim()}
              >
                {MBO_COPY.createStepNext}
              </Button>
            ) : null}
            {step === 3 || canSubmitFromStep1 ? (
              <Button
                variant="primary"
                type="submit"
                form="mbo-create-objective-form"
                data-testid="mbo-create-objective-submit"
                disabled={submitBlocked || createBusy}
                isLoading={createBusy}
              >
                {MBO_COPY.createStepSubmit}
              </Button>
            ) : null}
            {personalPath && step === 1 ? (
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                {MBO_COPY.createAdvancedToggle}
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      <MboImmediateSuperiorBar result={immediateSuperior} />
      <p className="mt-2 text-[11px] leading-relaxed text-slate-600" data-testid="mbo-goal-hierarchy-hint">
        <span className="font-semibold">
          {MBO_COPY.levelHintTitle(levelLabelKo(maxCreatableLevel))}
          {goalActor.roleName ? ` · ${goalActor.roleName}` : ''}
        </span>
        {' — '}
        {MBO_COPY.levelHintBody}
      </p>

      <form
        id="mbo-create-objective-form"
        onSubmit={onSubmit}
        className="mt-3 space-y-3.5"
        data-testid="mbo-create-objective-form"
      >
        {step === 1 ? <CreateStepBasics {...props} /> : null}
        {step === 2 ? <CreateStepHierarchy {...props} /> : null}
        {step === 3 ? <CreateStepAccess {...props} /> : null}
      </form>
    </Modal>
  );
};
