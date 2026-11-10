import React from 'react';
import { X } from 'lucide-react';
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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900">{MBO_COPY.createGoalModal}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <MboImmediateSuperiorBar result={immediateSuperior} />

        <form onSubmit={onSubmit} className="space-y-3.5" data-testid="mbo-create-objective-form">
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
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{MBO_COPY.levelSelect}</label>
              <select
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                data-testid="mbo-create-objective-level"
              >
                {creatableLevels.map((level) => (
                  <option key={level} value={level}>
                    {levelLabelKo(level)}
                  </option>
                ))}
              </select>
              {!hasPrerequisiteGoals(newLevel, existingGoalRefs) ? (
                <p className="mt-1 text-[11px] font-semibold text-amber-700">
                  {prerequisiteLabel(newLevel)}가 아직 없습니다.
                </p>
              ) : null}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{MBO_COPY.weightLabel}</label>
              <input
                type="number"
                min="1"
                max="100"
                value={newWeight}
                onChange={(e) => onWeightChange(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>
          </div>

          {newLevel !== 'company' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">상위 목표 *</label>
              <select
                value={newParentId}
                onChange={(e) => onParentIdChange(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
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
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">목표 타이틀 *</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={MBO_COPY.createGoalTitlePlaceholder}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              data-testid="mbo-create-objective-title"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">핵심 성공 기준 (KPI) *</label>
            <input
              type="text"
              value={newCriteria}
              onChange={(e) => onCriteriaChange(e.target.value)}
              placeholder={MBO_COPY.createGoalCriteriaPlaceholder}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              data-testid="mbo-create-objective-criteria"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{MBO_COPY.ownerPickerLabel} *</label>
            <button
              type="button"
              onClick={onOpenOwnerPicker}
              className="w-full min-h-12 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-left"
            >
              {selectedOwnerMember?.displayName || MBO_COPY.ownerPickerPlaceholder}
            </button>
            {selectedOwnerMember?.departmentName ? (
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                {MBO_COPY.ownerDepartmentLine(selectedOwnerMember.departmentName)}
              </p>
            ) : selectedOwnerMember ? (
              <p className="mt-1 text-[11px] font-semibold text-amber-700">조직도에 부서 정보가 없습니다.</p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">공개범위</label>
            <select
              value={newVisibility}
              onChange={(e) => onVisibilityChange(e.target.value as MboVisibilityType)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
            >
              <option value="PRIVATE">비공개 (본인·부서장·관리자)</option>
              <option value="PUBLIC">전체 공개 (조직 멤버)</option>
              <option value="PARTIAL">선택 공개</option>
            </select>
            {newVisibility === 'PARTIAL' ? (
              <button
                type="button"
                className="mt-2 min-h-12 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-xs font-bold text-indigo-800"
                onClick={onOpenSharePicker}
              >
                공유 대상 {newShareMemberIds.length}명 선택
              </button>
            ) : null}
          </div>

          <MboScheduleRangePicker
            startDate={newStartDate}
            targetDate={newTargetDate}
            onChange={onScheduleChange}
          />

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="min-h-12 px-4 text-xs font-semibold text-slate-500">
              취소
            </button>
            <button
              type="submit"
              data-testid="mbo-create-objective-submit"
              className="min-h-12 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
            >
              등록 완료
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
