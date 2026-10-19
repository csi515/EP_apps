import React, { useState } from 'react';
import { customerNameFilter } from '@/core/customers/chosungSearch';
import { VirtualRows } from './VirtualRows';

export type CounterVisitor = { id: string; name: string; chosung: string };

type Props = {
  visitors: CounterVisitor[];
  directory: CounterVisitor[];
  onToggle: (id: string) => void;
};

export function CounterSearchPanel({ visitors, directory, onToggle }: Props) {
  const [query, setQuery] = useState('');
  const filter = customerNameFilter(query);
  const matched = query
    ? directory.filter((person) =>
        filter.column === 'chosung'
          ? person.chosung.startsWith(query.trim())
          : person.name.includes(query.trim())
      )
    : directory;

  return (
    <section className="space-y-3">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="이름 또는 초성"
        className="min-h-12 w-full rounded-xl border px-3"
      />
      <p className="text-xs text-slate-500">{filter.column === 'chosung' ? '초성 인덱스 조회' : '이름 조회'}</p>
      <div className="flex flex-wrap gap-2">
        {visitors.slice(0, 5).map((person) => (
          <button key={person.id} type="button" className="min-h-12 rounded-full bg-slate-100 px-3 text-sm" onClick={() => onToggle(person.id)}>
            {person.name}
          </button>
        ))}
      </div>
      <VirtualRows
        items={matched}
        estimate={48}
        render={(person) => (
          <button type="button" className="min-h-12 w-full text-left" onClick={() => onToggle(person.id)}>
            {person.name}
          </button>
        )}
      />
    </section>
  );
}
