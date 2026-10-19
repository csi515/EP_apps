import React from 'react';

export type FamilyProfile = {
  id: string;
  name: string;
  remainingPasses: number;
  todayAttendance: string;
};

type Props = {
  members: FamilyProfile[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function FamilyMemberSwitcher({ members, selectedId, onSelect }: Props) {
  const selected = members.find((member) => member.id === selectedId) ?? members[0];
  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto">
        {members.map((member) => (
          <button
            key={member.id}
            type="button"
            className={`min-h-12 shrink-0 rounded-full px-4 text-sm font-bold ${member.id === selected?.id ? 'bg-slate-900 text-white' : 'bg-white'}`}
            onClick={() => onSelect(member.id)}
          >
            {member.name}
          </button>
        ))}
      </div>
      {selected ? (
        <p className="text-sm text-slate-600">
          잔여 수강권 {selected.remainingPasses}회 · 오늘 출결 {selected.todayAttendance}
        </p>
      ) : null}
    </div>
  );
}
