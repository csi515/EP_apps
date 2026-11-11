import React from 'react';
import type { MboLevel } from '../domain/mboEngine';
import type { MboVisibilityType } from '../domain/mboVisibilityEngine';
import {
  hasPrerequisiteGoals,
  levelLabelKo,
  listEligibleParentGoals,
  prerequisiteLabel,
  type ExistingGoalRef,
  type GoalHierarchyActor,
} from '../domain/mboGoalHierarchy';
import type { ImmediateSuperiorResult } from '@/core/organizations/resolveImmediateSuperior';
import type { MboPickerMember } from '../services/mboOrgScopeService';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui/FormField';
import { Input } from '@/shared/components/ui/Input';
import { MboImmediateSuperiorBar } from './MboImmediateSuperiorBar';
import { MboScheduleRangePicker } from './MboScheduleRangePicker';
import { MBO_COPY } from './mboUiCopy';
import type { ObjectiveNode } from './MboObjectiveTreeViewer';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newLevel: MboLevel;
  onLevelChange: (level: MboLevel) => void;
  newWeight: number;
  onWeightChange: (n: number) => void;
  newParentId: string;
  onParentIdChange: (id: string) => void;
  newTitle: string;
  onTitleChange: (v: string) => void;
  newCriteria: string;
  onCriteriaChange: (v: string) => void;
  newVisibility: MboVisibilityType;
  onVisibilityChange: (v: MboVisibilityType) => void;
  newShareMemberIds: string[];
  newStartDate: string;
  newTargetDate: string;
  onScheduleChange: (range: { startDate: string; targetDate: string }) => void;
  creatableLevels: MboLevel[];
  maxCreatableLevel: MboLevel;
  goalActor: GoalHierarchyActor;
  existingGoalRefs: ExistingGoalRef[];
  eligibleParents: ExistingGoalRef[];
  objectives: ObjectiveNode[];
  selectedOwnerMember: MboPickerMember | null;
  onOpenOwnerPicker: () => void;
  onOpenSharePicker: () => void;
  immediateSuperior?: ImmediateSuperiorResult | null;
};

export const MboCreateObjectiveModal: React.FC<Props> = ({
  open,
  onClose,
  onSubmit,
  newLevel,
  onLevelChange,
  newWeight,
  onWeightChange,
  newParentId,
  onParentIdChange,
  newTitle,
  onTitleChange,
  newCriteria,
  onCriteriaChange,
  newVisibility,
  onVisibilityChange,
  newShareMemberIds,
  newStartDate,
  newTargetDate,
  onScheduleChange,
  creatableLevels,
  maxCreatableLevel,
  goalActor,
  existingGoalRefs,
  eligibleParents,
  objectives,
  selectedOwnerMember,
  onOpenOwnerPicker,
  onOpenSharePicker,
  immediateSuperior,
}) => {
  const weightHint = (() => {
    const ownerId = selectedOwnerMember?.userId;
    const siblingTotal = objectives
      .filter((o) => !o.deletedAt && (!ownerId || o.ownerId === ownerId))
      .reduce((sum, o) => sum + (o.weight || 0), 0);
    const projected = siblingTotal + (Number.isFinite(newWeight) ? newWeight : 0);
    const diff = 100 - projected;
    if (diff === 0) return undefined;
    return MBO_COPY.weightInvalid(projected, diff);
  })();

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={MBO_COPY.createGoalModal}
      maxWidth="lg"
      intent="form"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="mbo-create-objective-form"
            data-testid="mbo-create-objective-submit"
          >
            등록 완료
          </Button>
        </div>
      }
    >
      <MboImmediateSuperiorBar result={immediateSuperior} />

      <form
        id="mbo-create-objective-form"
        onSubmit={onSubmit}
        className="mt-3 space-y-3.5"
        data-testid="mbo-create-objective-form"
      >
        <div
          className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2.5 text-[11px] leading-relaxed text-indigo-950"
          data-testid="mbo-goal-hierarchy-hint"
        >
          <p className="font-bold">
            {MBO_COPY.levelHintTitle(levelLabelKo(maxCreatableLevel))}
            {goalActor.roleName ? ` · ${goalActor.roleName}` : ''}
          </p>
          <p className="mt-1 text-indigo-800/90">{MBO_COPY.levelHintBody}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            label={MBO_COPY.levelSelect}
            htmlFor="mbo-create-level"
            hint={
              !hasPrerequisiteGoals(newLevel, existingGoalRefs)
                ? `${prerequisiteLabel(newLevel)}가 아직 없습니다.`
                : undefined
            }
          >
            <select
              id="mbo-create-level"
              value={newLevel}
              onChange={(e) => {
                const next = e.target.value as MboLevel;
                onLevelChange(next);
                if (next === 'company') {
                  onParentIdChange('');
                } else {
                  const parents = listEligibleParentGoals(next, existingGoalRefs);
                  onParentIdChange(
                    parents.some((p) => p.id === newParentId) ? newParentId : parents[0]?.id || ''
                  );
                }
              }}
              className={FORM_CONTROL_CLASS}
              data-testid="mbo-create-objective-level"
            >
              {creatableLevels.map((level) => (
                <option key={level} value={level}>
                  {levelLabelKo(level)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={MBO_COPY.weightLabel} htmlFor="mbo-create-weight" hint={weightHint}>
            <Input
              id="mbo-create-weight"
              type="number"
              min={1}
              max={100}
              value={newWeight}
              onChange={(e) => onWeightChange(Number(e.target.value))}
              inputSize="md"
            />
          </FormField>
        </div>

        {newLevel !== 'company' ? (
          <FormField label="상위 목표" htmlFor="mbo-create-parent" required>
            <select
              id="mbo-create-parent"
              value={newParentId}
              onChange={(e) => onParentIdChange(e.target.value)}
              required
              className={FORM_CONTROL_CLASS}
              data-testid="mbo-create-objective-parent"
            >
              <option value="">상위 목표 선택</option>
              {eligibleParents.map((parent) => {
                const title = objectives.find((o) => o.id === parent.id)?.title ?? parent.id;
                return (
                  <option key={parent.id} value={parent.id}>
                    [{levelLabelKo(parent.level)}] {title}
                  </option>
                );
              })}
            </select>
          </FormField>
        ) : null}

        <FormField
          label="목표 타이틀"
          htmlFor="mbo-create-title"
          required
          hint={MBO_COPY.createGoalTitleHint}
        >
          <Input
            id="mbo-create-title"
            value={newTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder={MBO_COPY.createGoalTitlePlaceholder}
            data-testid="mbo-create-objective-title"
            required
          />
        </FormField>

        <FormField
          label="핵심 성공 기준 (KPI)"
          htmlFor="mbo-create-criteria"
          required
          hint={MBO_COPY.createGoalCriteriaHint}
        >
          <Input
            id="mbo-create-criteria"
            value={newCriteria}
            onChange={(e) => onCriteriaChange(e.target.value)}
            placeholder={MBO_COPY.createGoalCriteriaPlaceholder}
            data-testid="mbo-create-objective-criteria"
            required
          />
        </FormField>

        <FormField label={MBO_COPY.ownerPickerLabel} required>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start font-semibold"
            onClick={onOpenOwnerPicker}
          >
            {selectedOwnerMember?.displayName || MBO_COPY.ownerPickerPlaceholder}
          </Button>
          {selectedOwnerMember?.departmentName ? (
            <p className="mt-1 text-[11px] font-semibold text-slate-500">
              {MBO_COPY.ownerDepartmentLine(selectedOwnerMember.departmentName)}
            </p>
          ) : selectedOwnerMember ? (
            <p className="mt-1 text-[11px] font-semibold text-amber-700">
              조직도에 부서 정보가 없습니다.
            </p>
          ) : null}
        </FormField>

        <FormField label="공개범위" htmlFor="mbo-create-visibility">
          <select
            id="mbo-create-visibility"
            value={newVisibility}
            onChange={(e) => onVisibilityChange(e.target.value as MboVisibilityType)}
            className={FORM_CONTROL_CLASS}
          >
            <option value="PRIVATE">비공개 (본인·부서장·관리자)</option>
            <option value="PUBLIC">전체 공개 (조직 멤버)</option>
            <option value="PARTIAL">선택 공개</option>
          </select>
          {newVisibility === 'PARTIAL' ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-2 w-full"
              onClick={onOpenSharePicker}
            >
              공유 대상 {newShareMemberIds.length}명 선택
            </Button>
          ) : null}
        </FormField>

        <MboScheduleRangePicker
          startDate={newStartDate}
          targetDate={newTargetDate}
          onChange={onScheduleChange}
        />
      </form>
    </Modal>
  );
};
