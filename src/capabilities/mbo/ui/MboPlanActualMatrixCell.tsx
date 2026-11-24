import React, { useEffect, useRef, useState } from 'react';
import type { MonthCellStatus } from '../domain/mboPlanActualMatrixEngine';
import { MBO_COPY } from './mboUiCopy';

type Props = {
  editable: boolean;
  text: string | null;
  status: MonthCellStatus;
  outOfRange: boolean;
  onCommitText: (value: string) => void;
  onChangeStatus: (status: MonthCellStatus) => void;
};

function cellTone(status: MonthCellStatus): string {
  if (status === 'highlighted') return 'bg-amber-100 text-slate-900';
  if (status === 'changed_or_delayed') return 'text-red-600 font-semibold';
  return 'text-slate-800';
}

export function MboPlanActualMatrixCell({
  editable,
  text,
  status,
  outOfRange,
  onCommitText,
  onChangeStatus,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text ?? '');
  const [showStatus, setShowStatus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(text ?? '');
  }, [text]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (outOfRange) {
    return (
      <td
        className="border border-slate-100 bg-[repeating-linear-gradient(-45deg,#f8fafc,#f8fafc_4px,#f1f5f9_4px,#f1f5f9_8px)] p-0"
        title={MBO_COPY.matrixOutOfRange}
        aria-label={MBO_COPY.matrixOutOfRange}
      >
        <div className="min-h-[1.75rem] w-[5.5rem]" />
      </td>
    );
  }

  const commit = () => {
    setEditing(false);
    setShowStatus(false);
    const next = draft.trim();
    const prev = (text ?? '').trim();
    if (next !== prev) onCommitText(next);
  };

  return (
    <td
      className={`relative border border-slate-100 p-0 align-top ${cellTone(status)}`}
      onContextMenu={(e) => {
        if (!editable) return;
        e.preventDefault();
        setShowStatus(true);
      }}
    >
      {editing && editable ? (
        <input
          ref={inputRef}
          className="h-7 w-[5.5rem] border-0 bg-white px-1 text-[11px] outline-none ring-1 ring-slate-400"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
            if (e.key === 'Escape') {
              setDraft(text ?? '');
              setEditing(false);
            }
          }}
          aria-label={MBO_COPY.matrixCellPlaceholder}
        />
      ) : (
        <button
          type="button"
          disabled={!editable}
          className={`flex min-h-[1.75rem] w-[5.5rem] items-start px-1 py-0.5 text-left text-[11px] leading-tight ${
            editable ? 'cursor-text hover:ring-1 hover:ring-slate-300' : 'cursor-default'
          }`}
          onClick={() => {
            if (!editable) return;
            setEditing(true);
            setShowStatus(true);
          }}
        >
          <span className={text?.trim() ? '' : 'text-slate-400'}>
            {text?.trim() || (editable ? MBO_COPY.matrixCellPlaceholder : '')}
          </span>
        </button>
      )}
      {showStatus && editable ? (
        <div className="absolute left-0 top-full z-20 flex min-w-[5.5rem] flex-col border border-slate-200 bg-white shadow-md">
          {(
            [
              ['normal', MBO_COPY.matrixStatusNormal],
              ['highlighted', MBO_COPY.matrixStatusHighlighted],
              ['changed_or_delayed', MBO_COPY.matrixStatusChanged],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`px-2 py-1 text-left text-[10px] hover:bg-slate-50 ${
                status === value ? 'font-semibold text-slate-900' : 'text-slate-600'
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChangeStatus(value);
                setShowStatus(false);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </td>
  );
}
