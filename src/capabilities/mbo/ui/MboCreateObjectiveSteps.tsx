import React from 'react';
import type { MboLevel } from '../domain/mboEngine';
import type { MboVisibilityType } from '../domain/mboVisibilityEngine';
import {
  defaultVisibilityForLevel,
  hasPrerequisiteGoals,
  levelLabelKo,
  listEligibleParentGoals,
  prerequisiteLabel,
  type ExistingGoalRef,
} from '../domain/mboGoalHierarchy';
import type { MboPickerMember } from '../services/mboOrgScopeService';
import { Button } from '@/shared/components/ui/Button';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui/FormField';
import { Input } from '@/shared/components/ui/Input';
import { MBO_COPY } from './mboUiCopy';
import type { ObjectiveNode } from '../domain/mboObjectiveNode';

type DeptOption = { id: string; name: string };

function ParentGoalSelect({
  id,
  value,
  onChange,
  parents,
  objectives,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (id: string) => void;
  parents: readonly ExistingGoalRef[];
  objectives: ObjectiveNode[];
  disabled?: boolean;
}) {
  return (
    <FormField
      label={MBO_COPY.parentGoalLabel}
      htmlFor={id}
      hint={MBO_COPY.parentGoalHint}
    >
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={FORM_CONTROL_CLASS}
        data-testid={id}
      >
        <option value="">{MBO_COPY.parentGoalNone}</option>
        {parents.map((parent) => {
          const title = objectives.find((o) => o.id === parent.id)?.title ?? parent.id;
          return (
            <option key={parent.id} value={parent.id}>
              [{levelLabelKo(parent.level)}] {title}
            </option>
          );
        })}
      </select>
    </FormField>
  );
}

export type CreateStepSharedProps = {
  newLevel: MboLevel;
  onLevelChange: (level: MboLevel) => void;
  newWeight: number;
  onWeightChange: (n: number) => void;
  newParentId: string;
  onParentIdChange: (id: string) => void;
  newDepartmentId: string;
  onDepartmentIdChange: (id: string, name: string) => void;
  departmentOptions: DeptOption[];
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
  existingGoalRefs: ExistingGoalRef[];
  eligibleParents: ExistingGoalRef[];
  objectives: ObjectiveNode[];
  selectedOwnerMember: MboPickerMember | null;
  onOpenOwnerPicker: () => void;
  onOpenSharePicker: () => void;
};

export function CreateStepBasics({
  newTitle,
  onTitleChange,
  newCriteria,
  onCriteriaChange,
  newWeight,
  onWeightChange,
  newLevel,
  newParentId,
  onParentIdChange,
  eligibleParents,
  newStartDate,
  newTargetDate,
  onScheduleChange,
  objectives,
  selectedOwnerMember,
}: Pick<
  CreateStepSharedProps,
  | 'newTitle'
  | 'onTitleChange'
  | 'newCriteria'
  | 'onCriteriaChange'
  | 'newWeight'
  | 'onWeightChange'
  | 'newLevel'
  | 'newParentId'
  | 'onParentIdChange'
  | 'eligibleParents'
  | 'newStartDate'
  | 'newTargetDate'
  | 'onScheduleChange'
  | 'objectives'
  | 'selectedOwnerMember'
>) {
  const ownerId = selectedOwnerMember?.userId;
  const siblingTotal = objectives
    .filter((o) => !o.deletedAt && (!ownerId || o.ownerId === ownerId))
    .reduce((sum, o) => sum + (o.weight || 0), 0);
  const projected = siblingTotal + (Number.isFinite(newWeight) ? newWeight : 0);
  const diff = 100 - projected;
  const weightHint = diff === 0 ? undefined : MBO_COPY.weightInvalid(projected, diff);

  return (
    <>
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
      <FormField label={MBO_COPY.weightLabel} htmlFor="mbo-create-weight" hint={weightHint}>
        <Input
          id="mbo-create-weight"
          type="number"
          min={1}
          max={100}
          value={newWeight}
          onChange={(e) => onWeightChange(Number(e.target.value))}
          inputSize="md"
          data-testid="mbo-create-objective-weight"
        />
      </FormField>
      {newLevel !== 'company' ? (
        <ParentGoalSelect
          id="mbo-create-parent"
          value={newParentId}
          onChange={onParentIdChange}
          parents={eligibleParents}
          objectives={objectives}
        />
      ) : null}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <FormField label="시작일" htmlFor="mbo-create-start" required>
          <input
            id="mbo-create-start"
            type="date"
            className={FORM_CONTROL_CLASS}
            value={newStartDate}
            onChange={(e) =>
              onScheduleChange({ startDate: e.target.value, targetDate: newTargetDate })
            }
            data-testid="mbo-create-objective-start"
            required
          />
        </FormField>
        <FormField label="종료일" htmlFor="mbo-create-end" required>
          <input
            id="mbo-create-end"
            type="date"
            className={FORM_CONTROL_CLASS}
            value={newTargetDate}
            onChange={(e) =>
              onScheduleChange({ startDate: newStartDate, targetDate: e.target.value })
            }
            data-testid="mbo-create-objective-end"
            required
          />
        </FormField>
      </div>
    </>
  );
}

export function CreateStepHierarchy({
  newLevel,
  onLevelChange,
  newParentId,
  onParentIdChange,
  newDepartmentId,
  onDepartmentIdChange,
  departmentOptions,
  creatableLevels,
  existingGoalRefs,
  eligibleParents,
  objectives,
  onVisibilityChange,
}: CreateStepSharedProps) {
  return (
    <>
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
            onVisibilityChange(defaultVisibilityForLevel(next));
            if (next === 'company') {
              onParentIdChange('');
            } else {
              const parents = listEligibleParentGoals(next, existingGoalRefs);
              onParentIdChange(
                parents.some((p) => p.id === newParentId) ? newParentId : '',
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

      {newLevel !== 'company' ? (
        <ParentGoalSelect
          id="mbo-create-parent-hierarchy"
          value={newParentId}
          onChange={onParentIdChange}
          parents={eligibleParents}
          objectives={objectives}
        />
      ) : null}

      {newLevel === 'department' ? (
        <FormField label="대상 조직" htmlFor="mbo-create-department" required>
          <select
            id="mbo-create-department"
            value={newDepartmentId}
            onChange={(e) => {
              const id = e.target.value;
              const name = departmentOptions.find((d) => d.id === id)?.name ?? '';
              onDepartmentIdChange(id, name);
            }}
            required
            className={FORM_CONTROL_CLASS}
            data-testid="mbo-create-objective-department"
          >
            <option value="">조직 선택</option>
            {departmentOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </FormField>
      ) : null}
    </>
  );
}

export function CreateStepAccess({
  selectedOwnerMember,
  onOpenOwnerPicker,
  newVisibility,
  onVisibilityChange,
  newShareMemberIds,
  onOpenSharePicker,
}: Pick<
  CreateStepSharedProps,
  | 'selectedOwnerMember'
  | 'onOpenOwnerPicker'
  | 'newVisibility'
  | 'onVisibilityChange'
  | 'newShareMemberIds'
  | 'onOpenSharePicker'
>) {
  return (
    <>
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
    </>
  );
}
