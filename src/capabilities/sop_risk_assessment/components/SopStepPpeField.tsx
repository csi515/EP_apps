import React, { useEffect, useState } from 'react';

type Props = {
  value: string[];
  disabled: boolean;
  onCommit: (next: string[]) => void;
};

function parsePpe(text: string): string[] {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const SopStepPpeField: React.FC<Props> = ({ value, disabled, onCommit }) => {
  const joined = value.join(', ');
  const [text, setText] = useState(joined);

  useEffect(() => {
    setText(joined);
  }, [joined]);

  return (
    <input
      className="h-11 w-full rounded-lg border border-slate-300 px-2 text-xs"
      disabled={disabled}
      aria-label="필수 보호구"
      value={disabled ? joined : text}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        if (!next.endsWith(',') && !next.endsWith(' ')) onCommit(parsePpe(next));
      }}
      onBlur={() => onCommit(parsePpe(text))}
    />
  );
};
