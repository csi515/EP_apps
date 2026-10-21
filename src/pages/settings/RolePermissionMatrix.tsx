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
    title: '매장 운영 및 인사/권한 위임',
    items: [
      { key: 'members:manage', label: '직원 목록 및 정보 관리 (members:manage)' },
      { key: 'roles:assign', label: '타 직원의 직급/권한 부여 및 회수 (roles:assign)' },
      { key: 'ownership:transfer', label: '대표이사(CEO) 변경 및 소유권 이전 대행 (ownership:transfer) [이사회/인사 전용]' },
      { key: 'policies', label: '매장 내규 관리' },
    ],
  },
  {
    title: '공용 자원 및 시설/공간 관리',
    items: [
      { key: 'seat_room', label: '좌석 및 회의실 공간 관리 (seat_room)' },
      { key: 'rental_equipment', label: '대여 장비 및 비품 관리 (rental_equipment)' },
      { key: 'resources_manage', label: '공용차량·자원 등록/수정' },
      { key: 'resources:manage', label: '공용자원 카탈로그 (alias)' },
      { key: 'feedbacks:read_all', label: '사내 건의 전체 열람 (alias)' },
      { key: 'grievances_manage', label: '노경 건의 전체 조회·처리' },
      { key: 'shuttle:manage', label: '통근 셔틀 노선·명부 관리 (shuttle:manage)' },
    ],
  },
];

type Props = {
  value: RolePermissionMap;
  onChange: (next: RolePermissionMap) => void;
};

export function RolePermissionMatrix({ value, onChange }: Props) {
  function handleToggle(key: RolePermissionKey, checked: boolean) {
    const next = { ...value, [key]: checked };
    if (key === 'members:manage') {
      next.members_manage = checked;
    } else if (key === 'members_manage') {
      next['members:manage'] = checked;
    }
    onChange(next);
  }

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
                  checked={Boolean(value[item.key])}
                  onChange={(event) => handleToggle(item.key, event.target.checked)}
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
