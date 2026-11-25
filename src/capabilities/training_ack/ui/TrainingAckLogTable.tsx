import React from 'react';
import { formatAckedAt } from '../domain/trainingAckEngine';
import type { TrainingAcknowledgmentRow } from '../trainingAckService';
import { TRAINING_COPY } from './trainingUiCopy';

type Props = {
  rows: TrainingAcknowledgmentRow[];
  memberName: (id: string) => string;
};

export function TrainingAckLogTable({ rows, memberName }: Props) {
  if (rows.length === 0) {
    return <p className="text-xs text-slate-500">{TRAINING_COPY.logsEmpty}</p>;
  }
  return (
    <table className="w-full text-left text-xs">
      <thead className="text-slate-500">
        <tr>
          <th className="py-1">{TRAINING_COPY.memberCol}</th>
          <th className="py-1">{TRAINING_COPY.ackedAtCol}</th>
          <th className="py-1">{TRAINING_COPY.revisionCol}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((a) => (
          <tr key={a.id} className="border-t border-slate-100">
            <td className="py-1.5">{memberName(a.member_id)}</td>
            <td className="py-1.5 font-medium text-slate-800">{formatAckedAt(a.acked_at)}</td>
            <td className="py-1.5">r{a.course_revision}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
