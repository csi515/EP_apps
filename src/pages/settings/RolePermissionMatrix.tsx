import React from 'react';
import type { RolePermissionKey, RolePermissionMap } from '@/domain/permissions';

const GROUPS: { title: string; items: { key: RolePermissionKey; label: string }[] }[] = [
  {
    title: '출결 및 수업 운영',
    items: [
      { key: 'attendance', label: '출결 체크' },
      { key: 'booking', label: '시간표/예약 관리' },
      { key: 'passes', label: '이용권 확인' },
    ],
  },
  {
    title: '재무 및 매출 장부',
    items: [
      { key: 'billing_invoices', label: '수납/미납 장부 조회' },
      { key: 'statistics', label: '매출 통계' },
    ],
  },
  {
    title: '매장 운영 및 인사',
    items: [
      { key: 'members_manage', label: '직원 초대/직급 부여' },
      { key: 'policies', label: '매장 내규 관리' },
    ],
  },
  {
    title: '공용 자원 및 노경',
    items: [
      { key: 'resources_manage', label: '공용차량·자원 등록/수정' },
      { key: 'grievances_manage', label: '노경 건의 전체 조회·처리' },
    ],
  },
];

type Props = {
  value: RolePermissionMap;
  onChange: (next: RolePermissionMap) => void;
};

export function RolePermissionMatrix({ value, onChange }: Props) {
  return (
    <div className="space-y-4" data-testid="role-permission-matrix">
      {GROUPS.map((group) => (
        <fieldset key={group.title} className="rounded-xl border border-slate-200 p-3">
          <legend className="px-1 text-sm font-bold text-slate-800">{group.title}</legend>
          <div className="mt-2 space-y-2">
            {group.items.map((item) => (
              <label key={item.key} className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={value[item.key]}
                  onChange={(event) => onChange({ ...value, [item.key]: event.target.checked })}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
