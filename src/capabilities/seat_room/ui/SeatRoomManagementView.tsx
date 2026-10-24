import React, { useState } from 'react';
import { useOpsTable } from '@/hooks/useOpsTable';
import { readOpsRuntimeSettings } from '@/core/capabilities/opsRuntimeSettings';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useTenantTerms } from '@/core/i18n';

type SeatRoomRow = {
  id: string;
  name: string;
  capacity: number;
  status: string;
  department_id?: string | null;
};

export interface SeatRoomManagementViewProps {
  title?: string;
  subtitle?: string;
  roomLabel?: string;
  defaultCapacity?: number;
}

export const SeatRoomManagementView: React.FC<SeatRoomManagementViewProps> = ({
  title,
  subtitle,
  roomLabel,
  defaultCapacity,
}) => {
  const { t } = useTenantTerms();
  const spaceTerm = t('space', '공간');
  const resolvedTitle = title ?? `${spaceTerm}·좌석 현황`;
  const resolvedSubtitle = subtitle ?? `${spaceTerm}·좌석을 등록하고 예약 캘린더와 분리해 관리합니다.`;
  const resolvedRoomLabel = roomLabel ?? `${spaceTerm}·좌석`;

  const { currentOrganization } = useOrganization();
  const runtime = readOpsRuntimeSettings(
    (currentOrganization?.settings ?? null) as Record<string, unknown> | null,
  );
  const { rows, loading, error, create } = useOpsTable<SeatRoomRow>('seat_rooms');
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(String(defaultCapacity ?? runtime.seat_capacity_default ?? 1));

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <header>
        <h1 className="text-xl font-bold text-slate-900 truncate">{resolvedTitle}</h1>
        <p className="text-sm text-slate-500">{resolvedSubtitle}</p>
      </header>
      {loading ? <p className="text-sm text-slate-500">불러오는 중…</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          void create({
            name: name.trim(),
            capacity: Number(capacity) || 1,
            status: 'available',
            department_id: null,
          }).then(() => {
            setName('');
          });
        }}
      >
        <input
          className="min-h-11 min-w-[200px] flex-1 rounded-lg border px-3 text-sm"
          placeholder={`${resolvedRoomLabel} 이름`}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          className="min-h-11 w-24 rounded-lg border px-3 text-sm"
          type="number"
          min={1}
          value={capacity}
          onChange={(event) => setCapacity(event.target.value)}
          aria-label="정원"
        />
        <button type="submit" className="min-h-11 min-w-[70px] rounded-lg bg-slate-900 px-4 text-sm text-white">
          추가
        </button>
      </form>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
            <span className="font-medium truncate mr-2">{row.name}</span>
            <span className="text-slate-500 shrink-0">정원 {row.capacity} · {row.status}</span>
          </li>
        ))}
      </ul>
    </main>
  );
};
