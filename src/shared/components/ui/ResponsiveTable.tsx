import React from "react";
import { ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { ListLoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ActionableEmptyState } from "@/components/common/ActionableEmptyState";

export interface ResponsiveColumn<T> {
  key: string;
  header: React.ReactNode;
  render: (record: T, index: number) => React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
  sortable?: boolean;
  sortOrder?: "asc" | "desc";
  onSort?: () => void;
}

export interface ResponsiveTableProps<T> {
  data: T[];
  columns: ResponsiveColumn<T>[];
  /** @deprecated 데스크톱 전용 — 무시됨. 호환을 위해 optional 유지 */
  renderMobileCard?: (record: T, index: number) => React.ReactNode;
  keyExtractor: (record: T, index: number) => string;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  emptyState,
  className = "",
}: ResponsiveTableProps<T>) {
  if (isLoading) {
    return <ListLoadingSkeleton />;
  }

  if (data.length === 0) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-dashed border-slate-200 p-6">
        {emptyState || (
          <ActionableEmptyState
            iconName="check"
            title="등록된 항목이 없습니다"
            description="새 항목을 등록하면 여기에 표시됩니다."
          />
        )}
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs font-semibold text-slate-700 border-b border-slate-200">
              <tr>
                {columns.map((col) => {
                  const alignClass =
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left";

                  return (
                    <th
                      key={col.key}
                      scope="col"
                      className={`px-6 py-3.5 ${alignClass} ${col.className || ""}`}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={col.onSort}
                          className={`inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors ${
                            col.sortOrder ? "text-indigo-600 font-bold" : ""
                          }`}
                        >
                          <span>{col.header}</span>
                          {col.sortOrder === "asc" ? (
                            <ChevronUp className="h-3.5 w-3.5 text-indigo-600" />
                          ) : col.sortOrder === "desc" ? (
                            <ChevronDown className="h-3.5 w-3.5 text-indigo-600" />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((record, index) => {
                const rowKey = keyExtractor(record, index);
                return (
                  <tr
                    key={rowKey}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {columns.map((col) => {
                      const alignClass =
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                            ? "text-center"
                            : "text-left";
                      return (
                        <td
                          key={`${rowKey}-${col.key}`}
                          className={`px-6 py-4 ${alignClass} ${col.className || ""}`}
                        >
                          {col.render(record, index)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
