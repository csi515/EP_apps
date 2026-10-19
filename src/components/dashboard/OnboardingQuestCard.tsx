import React, { useState } from 'react';

const STEPS = [
  { id: 'shop', title: '매장 기본 정보 확인' },
  { id: 'qr', title: '1회용 QR로 고객 연동', hint: '카운터에 QR을 두고, 고객 휴대폰으로 한 번만 스캔하면 장부에 연결됩니다. 가상 손님은 만들지 않습니다.' },
  { id: 'counter', title: '카운터 안내 문구 확인' },
  { id: 'member', title: '첫 실제 회원 등록' },
] as const;

type Props = { memberCount: number };

export function OnboardingQuestCard({ memberCount }: Props) {
  const [done, setDone] = useState<Record<string, boolean>>({ member: memberCount > 0 });
  const [hint, setHint] = useState<string | null>(null);
  if (memberCount > 0) return null;
  const count = STEPS.filter((step) => done[step.id]).length;

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
      <h2 className="text-base font-black text-indigo-950">매장 오픈 준비 체크리스트 ({count}/4)</h2>
      <ul className="mt-3 space-y-2">
        {STEPS.map((step) => (
          <li key={step.id} className="flex min-h-12 items-center justify-between gap-2 rounded-xl bg-white px-3">
            <span className="text-sm font-medium">{step.title}</span>
            <span className="flex gap-2">
              {'hint' in step ? (
                <button type="button" className="min-h-12 text-xs text-indigo-700" onClick={() => setHint(hint === step.hint ? null : step.hint)}>
                  안내
                </button>
              ) : null}
              <button
                type="button"
                className="min-h-12 text-sm font-bold"
                onClick={() => setDone((prev) => ({ ...prev, [step.id]: !prev[step.id] }))}
              >
                {done[step.id] ? '완료' : '확인'}
              </button>
            </span>
          </li>
        ))}
      </ul>
      {hint ? <p className="mt-2 text-xs text-indigo-800">{hint}</p> : null}
    </section>
  );
}
