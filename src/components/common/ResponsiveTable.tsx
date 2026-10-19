import React from 'react';

export type ResponsiveColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
};

type Props<T> = {
  columns: ResponsiveColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  renderCard?: (row: T) => React.ReactNode;
};

export function ResponsiveTable<T>({ columns, rows, rowKey, renderCard }: Props<T>) {
  return (
    <>
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="min-h-12 border-b py-3 font-semibold">{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} className="py-3">{column.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 lg:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="rounded-2xl border bg-white p-3">
            {renderCard ? renderCard(row) : columns.map((column) => (
              <button key={column.key} type="button" className="flex min-h-12 w-full items-center justify-between text-left text-sm">
                <span className="text-slate-500">{column.header}</span>
                <span>{column.render(row)}</span>
              </button>
            ))}
          </li>
        ))}
      </ul>
    </>
  );
}
