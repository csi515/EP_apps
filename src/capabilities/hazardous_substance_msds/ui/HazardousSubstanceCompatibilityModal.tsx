import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import {
  HAZARD_CLASS_LABELS,
  type ChemicalReagent,
  type HazardClass,
  type CompatibilityCheckResult,
} from '../domain/hazardousSubstanceEngine';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { FORM_CONTROL_CLASS } from '@/shared/components/ui/FormField';

export type HazardousSubstanceCompatibilityModalProps = {
  isOpen: boolean;
  onClose: () => void;
  reagents: ChemicalReagent[];
  useInventoryCompatibility: boolean;
  compAId: string;
  setCompAId: (v: string) => void;
  compBId: string;
  setCompBId: (v: string) => void;
  compAHazard: HazardClass;
  setCompAHazard: (v: HazardClass) => void;
  compBHazard: HazardClass;
  setCompBHazard: (v: HazardClass) => void;
  compResult: CompatibilityCheckResult;
};

/** 혼합보관 호환성 검사 모달 */
export const HazardousSubstanceCompatibilityModal: React.FC<HazardousSubstanceCompatibilityModalProps> = ({
  isOpen,
  onClose,
  reagents,
  useInventoryCompatibility,
  compAId,
  setCompAId,
  compBId,
  setCompBId,
  compAHazard,
  setCompAHazard,
  compBHazard,
  setCompBHazard,
  compResult,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title="혼합보관 호환성 매트릭스 검사기" maxWidth="md">
    <p className="text-xs text-slate-500">
      {useInventoryCompatibility
        ? '등록된 시약 두 종을 선택해 동일 캐비닛 보관 가능 여부를 판정합니다.'
        : '위험물 성상(산·염기, 산화제·가연물 등)을 선택해 보관 호환성을 판정합니다. 인벤토리 연동 후에는 실제 시약 목록으로 검사할 수 있습니다.'}
    </p>

    <div className="grid grid-cols-2 gap-3 pt-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="compat-a">
          시약 1
        </label>
        {useInventoryCompatibility ? (
          <select
            id="compat-a"
            value={compAId}
            onChange={(e) => setCompAId(e.target.value)}
            className={FORM_CONTROL_CLASS}
          >
            {reagents.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        ) : (
          <select
            id="compat-a"
            value={compAHazard}
            onChange={(e) => setCompAHazard(e.target.value as HazardClass)}
            className={FORM_CONTROL_CLASS}
          >
            {Object.entries(HAZARD_CLASS_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="compat-b">
          시약 2
        </label>
        {useInventoryCompatibility ? (
          <select
            id="compat-b"
            value={compBId}
            onChange={(e) => setCompBId(e.target.value)}
            className={FORM_CONTROL_CLASS}
          >
            {reagents.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        ) : (
          <select
            id="compat-b"
            value={compBHazard}
            onChange={(e) => setCompBHazard(e.target.value as HazardClass)}
            className={FORM_CONTROL_CLASS}
          >
            {Object.entries(HAZARD_CLASS_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>

    <div
      className={`mt-4 rounded-xl border p-4 text-xs leading-relaxed ${
        compResult.isCompatible
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-rose-200 bg-rose-50 text-rose-800'
      }`}
    >
      <div className="mb-1 flex items-center gap-2 text-sm font-bold">
        {compResult.isCompatible ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
            혼합 보관 가능
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4 text-rose-600" aria-hidden />
            혼합 보관 금지
          </>
        )}
      </div>
      {compResult.hazardReason || '상호 반응 위험이 없어 동일 시약장 보관이 허용됩니다.'}
    </div>

    <div className="mt-4 flex justify-end">
      <Button type="button" variant="secondary" size="sm" onClick={onClose}>
        닫기
      </Button>
    </div>
  </Modal>
);