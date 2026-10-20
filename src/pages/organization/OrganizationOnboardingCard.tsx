import React, { useState } from 'react';
import { shouldAskDepartmentSetup } from '@/core/organizations/departmentScope';
import { ORG_CHART_COPY } from './orgChartCopy';

interface Props {
  presetId: string;
  category?: string | null;
  departments: string[];
  onChange: (names: string[]) => void;
}

export const OrganizationOnboardingCard: React.FC<Props> = ({ presetId, category, departments, onChange }) => {
  const [draft, setDraft] = useState('');
  if (!shouldAskDepartmentSetup(presetId, category)) return null;

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4" aria-label={ORG_CHART_COPY.title}>
      <h2 className="text-sm font-semibold text-slate-900">다중 부서/현장 분리</h2>
      <p className="mt-1 text-xs text-slate-600">기업·제조 프리셋에서만 부서를 만듭니다. 소규모 매장은 이 단계를 건너뜁니다.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {ORG_CHART_COPY.chips.map((chip) => (
          <button
            key={chip}
            type="button"
            className="min-h-11 rounded-full border border-slate-300 px-3 text-sm"
            onClick={() => onChange(Array.from(new Set([...departments, chip])))}
          >
            {chip}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          className="min-h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
          value={draft}
          aria-label={ORG_CHART_COPY.name}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          type="button"
          className="min-h-11 rounded-lg bg-slate-900 px-3 text-sm text-white"
          onClick={() => {
            const name = draft.trim();
            if (!name) return;
            onChange(Array.from(new Set([...departments, name])));
            setDraft('');
          }}
        >
          {ORG_CHART_COPY.create}
        </button>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {departments.map((name) => (
          <li key={name} className="rounded-full bg-slate-100 px-3 py-2 text-sm">{name}</li>
        ))}
      </ul>
    </section>
  );
};
