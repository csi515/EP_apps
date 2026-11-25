import React from 'react';
import { showToast } from '@/shared/feedback/uiFeedback';
import { Button } from '@/shared/components/ui/Button';
import { FORM_CONTROL_CLASS } from '@/shared/components/ui/FormField';
import type { TrainingAssigneeTarget } from '../domain/trainingAckEngine';
import { TRAINING_COPY } from './trainingUiCopy';

type Option = { id: string; name: string };

type Props = {
  departments: Option[];
  members: Option[];
  assignees: TrainingAssigneeTarget[];
  onChange: (next: TrainingAssigneeTarget[]) => void;
};

export function TrainingAssigneeEditor({
  departments,
  members,
  assignees,
  onChange,
}: Props) {
  const [pickDept, setPickDept] = React.useState('');
  const [pickMember, setPickMember] = React.useState('');

  const deptName = (id: string) => departments.find((d) => d.id === id)?.name ?? id.slice(0, 8);
  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? id.slice(0, 8);

  const addDept = () => {
    if (!pickDept) return;
    if (assignees.some((a) => a.departmentId === pickDept)) {
      showToast(TRAINING_COPY.duplicateAssign, 'info');
      return;
    }
    onChange([...assignees, { departmentId: pickDept }]);
    setPickDept('');
  };

  const addMember = () => {
    if (!pickMember) return;
    if (assignees.some((a) => a.memberId === pickMember)) {
      showToast(TRAINING_COPY.duplicateAssign, 'info');
      return;
    }
    onChange([...assignees, { memberId: pickMember }]);
    setPickMember('');
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-600">{TRAINING_COPY.assignDept}</p>
      <div className="flex flex-wrap gap-2">
        <select
          className={FORM_CONTROL_CLASS}
          value={pickDept}
          onChange={(e) => setPickDept(e.target.value)}
        >
          <option value="">{TRAINING_COPY.pickDept}</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <Button size="sm" variant="secondary" onClick={addDept}>
          {TRAINING_COPY.addDept}
        </Button>
      </div>
      <p className="text-xs font-semibold text-slate-600">{TRAINING_COPY.assignMember}</p>
      <div className="flex flex-wrap gap-2">
        <select
          className={FORM_CONTROL_CLASS}
          value={pickMember}
          onChange={(e) => setPickMember(e.target.value)}
        >
          <option value="">{TRAINING_COPY.pickMember}</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <Button size="sm" variant="secondary" onClick={addMember}>
          {TRAINING_COPY.addMember}
        </Button>
      </div>
      <ul className="space-y-1">
        {assignees.map((a, idx) => (
          <li
            key={`${a.departmentId ?? ''}-${a.memberId ?? ''}-${idx}`}
            className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5 text-xs"
          >
            <span>
              {a.departmentId
                ? `부서 · ${deptName(a.departmentId)}`
                : `개인 · ${memberName(a.memberId!)}`}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onChange(assignees.filter((_, i) => i !== idx))}
            >
              {TRAINING_COPY.remove}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
