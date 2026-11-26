import React from 'react';
import { HAZARD_CLASS_LABELS, type HazardClass } from '../domain/hazardousSubstanceEngine';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui/FormField';

export type ReagentFormFieldState = {
  formName: string;
  setFormName: (v: string) => void;
  formFormula: string;
  setFormFormula: (v: string) => void;
  formCas: string;
  setFormCas: (v: string) => void;
  formHazard: HazardClass;
  setFormHazard: (v: HazardClass) => void;
  formCabinet: string;
  setFormCabinet: (v: string) => void;
  formStock: number;
  setFormStock: (v: number) => void;
  formMinStock: number;
  setFormMinStock: (v: number) => void;
  formUnit: string;
  setFormUnit: (v: string) => void;
  formMsdsUrl: string;
  setFormMsdsUrl: (v: string) => void;
  formRegulatedPrecursor: boolean;
  setFormRegulatedPrecursor: (v: boolean) => void;
};

/** 시약 등록·수정 모달 공용 폼 필드 */
export const HazardousSubstanceReagentFormFields: React.FC<ReagentFormFieldState> = ({
  formName,
  setFormName,
  formFormula,
  setFormFormula,
  formCas,
  setFormCas,
  formHazard,
  setFormHazard,
  formCabinet,
  setFormCabinet,
  formStock,
  setFormStock,
  formMinStock,
  setFormMinStock,
  formUnit,
  setFormUnit,
  formMsdsUrl,
  setFormMsdsUrl,
  formRegulatedPrecursor,
  setFormRegulatedPrecursor,
}) => (
  <div className="space-y-3">
    <FormField label="시약 명칭" htmlFor="reagent-name">
      <input
        id="reagent-name"
        type="text"
        value={formName}
        onChange={(e) => setFormName(e.target.value)}
        className={FORM_CONTROL_CLASS}
        placeholder="예: 질산 68%"
      />
    </FormField>
    <FormField label="화학식 (선택)" htmlFor="reagent-formula">
      <input
        id="reagent-formula"
        type="text"
        value={formFormula}
        onChange={(e) => setFormFormula(e.target.value)}
        className={FORM_CONTROL_CLASS}
        placeholder="예: HNO3"
      />
    </FormField>
    <FormField label="CAS 등록번호" htmlFor="reagent-cas">
      <input
        id="reagent-cas"
        type="text"
        value={formCas}
        onChange={(e) => setFormCas(e.target.value)}
        className={FORM_CONTROL_CLASS}
        placeholder="예: 67-64-1"
      />
    </FormField>
    <FormField label="위험물 성상" htmlFor="reagent-hazard">
      <select
        id="reagent-hazard"
        value={formHazard}
        onChange={(e) => setFormHazard(e.target.value as HazardClass)}
        className={FORM_CONTROL_CLASS}
      >
        {Object.entries(HAZARD_CLASS_LABELS).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
    </FormField>
    <FormField label="보관 시약장" htmlFor="reagent-cabinet">
      <input
        id="reagent-cabinet"
        type="text"
        value={formCabinet}
        onChange={(e) => setFormCabinet(e.target.value)}
        className={FORM_CONTROL_CLASS}
        placeholder="예: 내화방폭 시약장 A-02"
      />
    </FormField>
    <div className="grid grid-cols-2 gap-3">
      <FormField label="현재 재고" htmlFor="reagent-stock">
        <input
          id="reagent-stock"
          type="number"
          min={0}
          step="any"
          value={formStock}
          onChange={(e) => setFormStock(Number(e.target.value))}
          className={FORM_CONTROL_CLASS}
        />
      </FormField>
      <FormField label="최소 안전재고" htmlFor="reagent-min-stock">
        <input
          id="reagent-min-stock"
          type="number"
          min={0}
          step="any"
          value={formMinStock}
          onChange={(e) => setFormMinStock(Number(e.target.value))}
          className={FORM_CONTROL_CLASS}
        />
      </FormField>
    </div>
    <FormField label="단위" htmlFor="reagent-unit">
      <select
        id="reagent-unit"
        value={formUnit}
        onChange={(e) => setFormUnit(e.target.value)}
        className={FORM_CONTROL_CLASS}
      >
        {['mL', 'L', 'g', 'kg'].map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
    </FormField>
    <FormField label="MSDS PDF URL (선택)" htmlFor="reagent-msds">
      <input
        id="reagent-msds"
        type="url"
        value={formMsdsUrl}
        onChange={(e) => setFormMsdsUrl(e.target.value)}
        className={FORM_CONTROL_CLASS}
        placeholder="https://..."
      />
    </FormField>
    <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
      <input
        type="checkbox"
        checked={formRegulatedPrecursor}
        onChange={(e) => setFormRegulatedPrecursor(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />
      규제 원료물질(전구체)
    </label>
  </div>
);