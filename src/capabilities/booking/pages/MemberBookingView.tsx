import React, { useMemo, useState } from 'react';
import { FamilyMemberSwitcher, type FamilyProfile } from '@/components/customer/FamilyMemberSwitcher';
import { weekDates } from '../domain/weekStrip';
import { shouldDeductPassOnCancel } from '../domain/bookingLogic';

const FAMILY: FamilyProfile[] = [
  { id: 'self', name: '본인', remainingPasses: 8, todayAttendance: '입실 전' },
  { id: 'child-1', name: '첫째', remainingPasses: 4, todayAttendance: '출석' },
  { id: 'child-2', name: '둘째', remainingPasses: 6, todayAttendance: '결석' },
];

const SLOTS = ['18:00', '19:00', '20:00'];

export function MemberBookingView() {
  const [memberId, setMemberId] = useState(FAMILY[0].id);
  const [selectedDay, setSelectedDay] = useState(() => new Date().toDateString());
  const [warn, setWarn] = useState(false);
  const days = useMemo(() => weekDates(new Date()), []);
  const member = FAMILY.find((item) => item.id === memberId) ?? FAMILY[0];

  function askCancel() {
    const startsAt = new Date();
    startsAt.setHours(19, 0, 0, 0);
    const late = shouldDeductPassOnCancel({
      startsAt,
      now: new Date(),
      cancellationDeadlineMinutes: 120,
    });
    setWarn(late);
  }

  return (
    <main className="min-h-[100svh] space-y-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <FamilyMemberSwitcher members={FAMILY} selectedId={memberId} onSelect={setMemberId} />
      <section className="rounded-2xl bg-emerald-50 p-4">
        <p className="text-sm text-emerald-800">{member.name} 잔여 수강권</p>
        <p className="text-2xl font-black">{member.remainingPasses}회</p>
      </section>
      <div className="flex gap-2 overflow-x-auto">
        {days.map((day) => (
          <button
            key={day.toDateString()}
            type="button"
            className={`min-h-12 min-w-16 rounded-2xl text-sm font-bold ${selectedDay === day.toDateString() ? 'bg-slate-900 text-white' : 'bg-white'}`}
            onClick={() => setSelectedDay(day.toDateString())}
          >
            {day.getMonth() + 1}/{day.getDate()}
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {SLOTS.map((time) => (
          <li key={time}>
            <button type="button" className="min-h-12 w-full rounded-2xl border bg-white text-left px-4 font-bold">
              {time} 예약
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="min-h-12 w-full rounded-xl bg-rose-600 font-bold text-white" onClick={askCancel}>
        예약 취소
      </button>
      {warn ? (
        <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl">
          <p className="text-sm font-bold">지금 취소하시면 수강권이 1회 차감됩니다</p>
          <button type="button" className="mt-3 min-h-12 w-full rounded-xl bg-slate-900 text-white" onClick={() => setWarn(false)}>
            확인
          </button>
        </div>
      ) : null}
    </main>
  );
}
