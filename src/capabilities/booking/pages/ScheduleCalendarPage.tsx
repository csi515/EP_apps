import React, { useMemo, useState } from 'react';
import { formatSlotBadge, weekDates } from '../domain/weekStrip';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { ActionableEmptyState } from '@/components/common/ActionableEmptyState';

const SLOTS = [
  { time: '19:00', remaining: 4, capacity: 6 },
  { time: '20:00', remaining: 0, capacity: 6 },
  { time: '21:00', remaining: 2, capacity: 6 },
];

export function ScheduleCalendarPage() {
  const [anchor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date().toDateString());
  const days = useMemo(() => weekDates(anchor), [anchor]);
  const [rows, setRows] = useState<typeof SLOTS>([]);

  return (
    <div className="min-h-[100svh] space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex gap-2 overflow-x-auto">
        {days.map((day) => {
          const key = day.toDateString();
          const active = key === selected;
          return (
            <button
              key={key}
              type="button"
              className={`min-h-12 min-w-16 shrink-0 rounded-2xl px-3 text-sm font-bold ${active ? 'bg-slate-900 text-white' : 'bg-white'}`}
              onClick={() => setSelected(key)}
            >
              {day.getMonth() + 1}/{day.getDate()}
            </button>
          );
        })}
      </div>
      {rows.length === 0 ? (
        <ActionableEmptyState
          iconName="calendar"
          title="이번 주 개설된 수업이 없습니다."
          description="선택한 날에 시간표를 만들면 예약과 출결을 바로 연결할 수 있습니다."
          actionButton={{ label: '+ 새 수업 개설하기', onClick: () => setRows(SLOTS) }}
        />
      ) : (
      <ResponsiveTable
        rows={rows}
        rowKey={(slot) => slot.time}
        renderCard={(slot) => {
          const badge = formatSlotBadge(slot.time, slot.remaining, slot.capacity);
          return <p className={`min-h-12 text-sm font-bold ${badge.closed ? 'text-rose-600' : 'text-emerald-600'}`}>{badge.label}</p>;
        }}
        columns={[
          { key: 'time', header: '시간', render: (slot) => slot.time },
          {
            key: 'badge',
            header: '정원',
            render: (slot) => {
              const badge = formatSlotBadge(slot.time, slot.remaining, slot.capacity);
              return <span className={badge.closed ? 'font-bold text-rose-600' : 'font-bold text-emerald-600'}>{badge.label}</span>;
            },
          },
        ]}
      />
      )}
    </div>
  );
}
