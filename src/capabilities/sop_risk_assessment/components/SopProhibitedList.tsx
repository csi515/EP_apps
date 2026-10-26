import React from 'react';
import { ShieldAlert } from 'lucide-react';

type Props = {
  actions: string[];
  editable: boolean;
  onChange: (actions: string[]) => void;
};

export const SopProhibitedList: React.FC<Props> = ({ actions, editable, onChange }) => {
  return (
    <section className="rounded-2xl border-2 border-red-500 bg-red-50/90 p-5">
      <div className="flex items-center gap-2 text-red-900">
        <ShieldAlert className="h-6 w-6 text-red-600" />
        <h3 className="text-base font-black">현장 생명 직결 절대 금지 행위 (Life-Critical Prohibited Actions)</h3>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {actions.map((action, index) => (
          <li key={`${index}-${action}`} className="flex items-center gap-2 rounded-xl border border-red-200 bg-white/80 p-2">
            {editable ? (
              <input
                className="h-11 min-w-0 flex-1 rounded-lg border border-red-200 px-2 text-sm"
                aria-label={`금지 행위 ${index + 1}`}
                value={action}
                onChange={(event) =>
                  onChange(actions.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
                }
              />
            ) : (
              <span className="text-sm font-bold text-red-800">{action}</span>
            )}
            {editable ? (
              <button
                type="button"
                className="h-11 shrink-0 rounded-lg px-3 text-sm font-bold text-red-700"
                onClick={() => onChange(actions.filter((_, itemIndex) => itemIndex !== index))}
              >
                삭제
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {editable ? (
        <button
          type="button"
          className="mt-3 h-11 rounded-xl bg-red-700 px-4 text-sm font-bold text-white"
          onClick={() => onChange([...actions, ''])}
        >
          금지 행위 추가
        </button>
      ) : null}
    </section>
  );
};
