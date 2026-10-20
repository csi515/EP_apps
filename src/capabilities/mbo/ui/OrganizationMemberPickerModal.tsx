import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { memberMatchesQuery } from '../domain/mboVisibilityEngine';

export type PickerMember = {
  id: string;
  userId: string;
  displayName: string;
  departmentId?: string | null;
  departmentName?: string;
};

export type PickerDepartment = {
  id: string;
  name: string;
  parentId: string | null;
};

interface Props {
  open: boolean;
  departments: PickerDepartment[];
  members: PickerMember[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const OrganizationMemberPickerModal: React.FC<Props> = ({
  open,
  departments,
  members,
  selectedIds,
  onChange,
  onClose,
  onConfirm,
}) => {
  const [query, setQuery] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const filtered = useMemo(() => {
    return members.filter((member) => {
      if (departmentId && member.departmentId !== departmentId) return false;
      return memberMatchesQuery(member.displayName, query);
    });
  }, [members, departmentId, query]);

  const selectedMembers = members.filter((m) => selectedIds.includes(m.id));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="사내 공개 대상자 선택"
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl bg-white sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-bold">사내 공개 대상자 선택 ({selectedIds.length}명)</h2>
          <button type="button" className="min-h-12 min-w-12 p-2" aria-label="닫기" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-3 overflow-auto p-4">
          <label className="block text-sm">
            부서
            <select
              className="mt-1 min-h-12 w-full rounded-lg border px-3"
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
            >
              <option value="">전체 부서</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            이름 / 초성 검색
            <input
              className="mt-1 min-h-12 w-full rounded-lg border px-3"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="예: 김민수 또는 ㄱㅁ"
            />
          </label>

          {selectedMembers.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {selectedMembers.map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    className="min-h-12 rounded-full bg-slate-100 px-3 text-sm"
                    onClick={() => onChange(selectedIds.filter((id) => id !== member.id))}
                  >
                    {member.displayName} ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <ul className="divide-y rounded-xl border">
            {filtered.map((member) => {
              const checked = selectedIds.includes(member.id);
              return (
                <li key={member.id}>
                  <label className="flex min-h-12 items-center gap-3 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        onChange(
                          checked
                            ? selectedIds.filter((id) => id !== member.id)
                            : [...selectedIds, member.id],
                        );
                      }}
                    />
                    <span className="flex-1">{member.displayName}</span>
                    <span className="text-xs text-slate-500">{member.departmentName || '미배정'}</span>
                  </label>
                </li>
              );
            })}
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-500">검색 결과가 없습니다.</li>
            ) : null}
          </ul>
        </div>

        <footer className="flex justify-end gap-2 border-t p-4">
          <button type="button" className="min-h-12 px-4 text-sm" onClick={onClose}>취소</button>
          <button
            type="button"
            className="min-h-12 rounded-xl bg-slate-900 px-4 text-sm text-white"
            onClick={onConfirm}
          >
            선택 완료
          </button>
        </footer>
      </div>
    </div>
  );
};
