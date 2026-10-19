import React, { useState } from 'react';

type Props = {
  length?: number;
  onComplete: (value: string) => void;
};

export function QuickNumberInput({ length = 4, onComplete }: Props) {
  const [value, setValue] = useState('');

  function press(digit: string) {
    const next = (value + digit).slice(0, length);
    setValue(next);
    if (next.length === length) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
      onComplete(next);
    }
  }

  return (
    <div>
      <input
        inputMode="numeric"
        readOnly
        value={value}
        aria-label="숫자 입력"
        className="min-h-12 w-full rounded-xl border bg-white px-3 text-center text-2xl tracking-[0.3em]"
      />
      <div className="mt-3 grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '←'].map((key) => (
          <button
            key={key}
            type="button"
            className="min-h-12 rounded-xl bg-slate-800 text-lg font-bold text-white"
            onClick={() => {
              if (key === 'C') setValue('');
              else if (key === '←') setValue((prev) => prev.slice(0, -1));
              else press(key);
            }}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}
