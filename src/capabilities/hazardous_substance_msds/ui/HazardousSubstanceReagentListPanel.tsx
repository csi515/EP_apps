import React from 'react';
import { FlaskConical } from 'lucide-react';
import { calculateReagentStockStatus, type ChemicalReagent } from '../domain/hazardousSubstanceEngine';
import { SearchField } from '@/shared/components/ui/SearchField';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { InlineBusy } from '@/shared/components/ui/Skeleton';

export type HazardousSubstanceReagentListPanelProps = {
  searchTerm: string;
  onSearchChange: (v: string) => void;
  isLoading: boolean;
  isError: boolean;
  onRefetch: () => void;
  filteredReagents: ChemicalReagent[];
  selectedReagentId: string | undefined;
  onSelectReagent: (reagent: ChemicalReagent) => void;
  persistenceEnabled: boolean;
  onOpenCreate: () => void;
  copy: {
    loadError: string;
    emptyTitle: string;
    emptyDescriptionLinked: string;
    emptyDescriptionOffline: string;
  };
};

/** 좌측 시약 검색·목록 패널 */
export const HazardousSubstanceReagentListPanel: React.FC<HazardousSubstanceReagentListPanelProps> = ({
  searchTerm,
  onSearchChange,
  isLoading,
  isError,
  onRefetch,
  filteredReagents,
  selectedReagentId,
  onSelectReagent,
  persistenceEnabled,
  onOpenCreate,
  copy,
}) => (
  <div className="space-y-3 lg:col-span-1">
    <SearchField
      value={searchTerm}
      onChange={onSearchChange}
      placeholder="시약명, CAS 번호, 보관장소 검색..."
    />

    {isLoading ? (
      <InlineBusy label="시약 목록 불러오는 중" />
    ) : isError ? (
      <EmptyState
        title={copy.loadError}
        action={{
          label: '다시 시도',
          onClick: onRefetch,
        }}
      />
    ) : filteredReagents.length === 0 ? (
      <EmptyState
        icon={<FlaskConical className="h-8 w-8 text-slate-300" aria-hidden />}
        title={copy.emptyTitle}
        description={
          persistenceEnabled ? copy.emptyDescriptionLinked : copy.emptyDescriptionOffline
        }
        action={
          persistenceEnabled
            ? {
                label: '시약 등록',
                onClick: onOpenCreate,
              }
            : undefined
        }
      />
    ) : (
      <div className="max-h-[600px] space-y-2 overflow-y-auto">
        {filteredReagents.map((r) => {
          const stockStatus = calculateReagentStockStatus(r.currentStock, r.minSafeStock);
          const isSelected = selectedReagentId === r.id;

          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectReagent(r)}
              className={`w-full rounded-xl border p-3 text-left transition-all ${
                isSelected
                  ? 'border-amber-500 bg-amber-50/40 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{r.name}</div>
                  <div className="mt-0.5 font-mono text-xs text-slate-500">CAS: {r.casNumber}</div>
                </div>
                {stockStatus === 'critical' && (
                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                    재고 소진
                  </span>
                )}
                {stockStatus === 'warning' && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                    재고 부족
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                <span className="max-w-[150px] truncate">{r.storageCabinetName}</span>
                <span className="font-semibold text-slate-800">
                  {r.currentStock.toLocaleString()} {r.unit}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    )}
  </div>
);