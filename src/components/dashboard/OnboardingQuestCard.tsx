import React, { useState } from 'react';
import { useTenantTerms } from '@/core/i18n';

type Props = { memberCount: number };

export function OnboardingQuestCard({ memberCount }: Props) {
  const { t } = useTenantTerms();
  const customerTerm = t('customer', '고객');

  const steps = [
    { id: 'shop', title: '매장 기본 정보 확인' },
    {
      id: 'qr',
      title: `QR로 ${customerTerm} 연동`,
      hint: `카운터에 QR을 두고, ${customerTerm} 휴대폰으로 한 번만 스캔하면 장부에 연결됩니다.`,
    },
    { id: 'counter', title: '카운터 안내 문구 확인' },
    { id: 'member', title: `첫 ${customerTerm} 등록` },
  ];

  const [done, setDone] = useState<Record<string, boolean>>({ member: memberCount > 0 });
  const [hint, setHint] = useState<string | null>(null);
  if (memberCount > 0) return null;
  const count = steps.filter((step) => done[step.id]).length;

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
      <h2 className="text-base font-black text-indigo-950">오픈 준비 체크리스트 ({count}/4)</h2>
      <ul className="mt-3 space-y-2">
        {steps.map((step) => (
          <li key={step.id} className="flex min-h-12 items-center justify-between gap-2 rounded-xl bg-white px-3">
            <span className="text-sm font-medium">{step.title}</span>
            <span className="flex gap-2 shrink-0">
              {'hint' in step && step.hint ? (
                <button
                  type="button"
                  className="min-h-12 text-xs text-indigo-700 hover:underline"
                  onClick={() => setHint(hint === step.hint ? null : step.hint!)}
                >
                  안내
                </button>
              ) : null}
              <button
                type="button"
                className="min-h-12 text-sm font-bold text-indigo-900"
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
