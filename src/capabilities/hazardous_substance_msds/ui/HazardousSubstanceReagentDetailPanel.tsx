import React from 'react';
import { AlertTriangle, Boxes, FileText, Pencil } from 'lucide-react';
import { HAZARD_CLASS_LABELS, type ChemicalReagent } from '../domain/hazardousSubstanceEngine';
import { Button } from '@/shared/components/ui/Button';

export type HazardousSubstanceReagentDetailPanelProps = {
  reagent: ChemicalReagent;
  persistenceEnabled: boolean;
  onEdit: () => void;
};

/** 시약 목록에서 선택한 항목의 상세 패널 */
export const HazardousSubstanceReagentDetailPanel: React.FC<HazardousSubstanceReagentDetailPanelProps> = ({
  reagent,
  persistenceEnabled,
  onEdit,
}) => (
  <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
    <div className="flex items-start justify-between border-b border-slate-100 pb-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{reagent.name}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>
            CAS 번호: <strong className="font-mono text-slate-700">{reagent.casNumber}</strong>
          </span>
          {reagent.formula && (
            <span>
              화학식: <strong className="font-mono text-slate-700">{reagent.formula}</strong>
            </span>
          )}
          {reagent.isRegulatedPrecursor && (
            <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
              규제 원료물질 (전구체)
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {reagent.msdsPdfUrl && (
          <a
            href={reagent.msdsPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <FileText className="h-3.5 w-3.5 text-indigo-600" aria-hidden />
            MSDS 열람
          </a>
        )}
        {persistenceEnabled && (
          <Button type="button" variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            정보 수정
          </Button>
        )}
      </div>
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Boxes className="h-4 w-4 text-slate-500" aria-hidden />
          보관 장소 및 캐비닛
        </div>
        <div className="mt-2 text-sm font-medium text-slate-900">{reagent.storageCabinetName}</div>
      </div>
      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
          위험물 성상 분류
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {reagent.hazardClasses.map((h) => (
            <span
              key={h}
              className="rounded bg-amber-100/70 px-2 py-0.5 text-xs font-medium text-amber-900"
            >
              {HAZARD_CLASS_LABELS[h] || h}
            </span>
          ))}
        </div>
      </div>
    </div>

    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
        <span>현재 재고 수준</span>
        <span>
          안전 기준: {reagent.minSafeStock.toLocaleString()} {reagent.unit}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">
          {reagent.currentStock.toLocaleString()}
        </span>
        <span className="text-sm text-slate-500">{reagent.unit}</span>
      </div>
    </div>
  </div>
);