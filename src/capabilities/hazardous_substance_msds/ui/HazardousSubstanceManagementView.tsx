import React, { useEffect, useMemo, useState } from 'react';
import {
  FlaskConical,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  FileText,
  Boxes,
} from 'lucide-react';
import {
  HAZARD_CLASS_LABELS,
  checkStorageCompatibility,
  calculateReagentStockStatus,
  type ChemicalReagent,
  type HazardClass,
} from '../domain/hazardousSubstanceEngine';
import { useHazardousSubstanceReagents } from '../hooks/useHazardousSubstanceReagents';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import { SearchField } from '@/shared/components/ui/SearchField';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { InlineBusy } from '@/shared/components/ui/Skeleton';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { FORM_CONTROL_CLASS } from '@/shared/components/ui/FormField';

const HAZARDOUS_SUBSTANCE_COPY = {
  persistenceBannerTitle: '서버 저장 미연동',
  persistenceBannerBody:
    '시약·MSDS 대장은 아직 데이터베이스에 연결되지 않았습니다. 목록은 비어 있으며 등록·수정은 스키마 마이그레이션 후 이용할 수 있습니다.',
  emptyTitle: '등록된 시약이 없습니다',
  emptyDescription: '데이터 연동 후 조직별 시약·MSDS 목록이 이곳에 표시됩니다.',
  loadError: '시약 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
};

export const HazardousSubstanceManagementView: React.FC = () => {
  const { reagents, persistenceEnabled, isLoading, isError, refetch } = useHazardousSubstanceReagents();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReagent, setSelectedReagent] = useState<ChemicalReagent | null>(null);

  const [checkOpen, setCheckOpen] = useState(false);
  const [compAId, setCompAId] = useState('');
  const [compBId, setCompBId] = useState('');
  const [compAHazard, setCompAHazard] = useState<HazardClass>('acid');
  const [compBHazard, setCompBHazard] = useState<HazardClass>('base');

  useEffect(() => {
    if (reagents.length === 0) {
      setSelectedReagent(null);
      return;
    }
    setSelectedReagent((prev) => {
      if (prev && reagents.some((r) => r.id === prev.id)) {
        return prev;
      }
      return reagents[0];
    });
  }, [reagents]);

  useEffect(() => {
    if (reagents.length >= 2) {
      setCompAId(reagents[0].id);
      setCompBId(reagents[1].id);
    }
  }, [reagents]);

  const filteredReagents = useMemo(
    () =>
      reagents.filter(
        (r) =>
          r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.casNumber.includes(searchTerm) ||
          r.storageCabinetName.includes(searchTerm),
      ),
    [reagents, searchTerm],
  );

  const useInventoryCompatibility = reagents.length >= 2;

  const compatibilityInputA = useMemo(() => {
    if (useInventoryCompatibility) {
      const r = reagents.find((item) => item.id === compAId) ?? reagents[0];
      return { name: r.name, hazardClasses: r.hazardClasses };
    }
    return { name: HAZARD_CLASS_LABELS[compAHazard], hazardClasses: [compAHazard] as HazardClass[] };
  }, [useInventoryCompatibility, reagents, compAId, compAHazard]);

  const compatibilityInputB = useMemo(() => {
    if (useInventoryCompatibility) {
      const r = reagents.find((item) => item.id === compBId) ?? reagents[1];
      return { name: r.name, hazardClasses: r.hazardClasses };
    }
    return { name: HAZARD_CLASS_LABELS[compBHazard], hazardClasses: [compBHazard] as HazardClass[] };
  }, [useInventoryCompatibility, reagents, compBId, compBHazard]);

  const compResult = checkStorageCompatibility(compatibilityInputA, compatibilityInputB);

  return (
    <WorkPageFrame width="hub">
      {!persistenceEnabled && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <div>
            <p className="font-bold">{HAZARDOUS_SUBSTANCE_COPY.persistenceBannerTitle}</p>
            <p className="mt-0.5 text-amber-900/80">{HAZARDOUS_SUBSTANCE_COPY.persistenceBannerBody}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-amber-600" aria-hidden />
            <h1 className="text-xl font-bold text-slate-900">유해화학물질 및 시약 MSDS 대장</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            화학물질 성상별 격리 보관, CAS 등록번호 검증, GHS 경고표지 및 위험물 안전재고 관리
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCheckOpen(true)}
          className="gap-1.5"
        >
          <ShieldAlert className="h-4 w-4 text-rose-500" aria-hidden />
          혼합보관 호환성 검사
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          <SearchField
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="시약명, CAS 번호, 보관장소 검색..."
          />

          {isLoading ? (
            <InlineBusy label="시약 목록 불러오는 중" />
          ) : isError ? (
            <EmptyState
              title={HAZARDOUS_SUBSTANCE_COPY.loadError}
              action={{
                label: '다시 시도',
                onClick: () => {
                  void refetch();
                },
              }}
            />
          ) : filteredReagents.length === 0 ? (
            <EmptyState
              icon={<FlaskConical className="h-8 w-8 text-slate-300" aria-hidden />}
              title={HAZARDOUS_SUBSTANCE_COPY.emptyTitle}
              description={HAZARDOUS_SUBSTANCE_COPY.emptyDescription}
            />
          ) : (
            <div className="max-h-[600px] space-y-2 overflow-y-auto">
              {filteredReagents.map((r) => {
                const stockStatus = calculateReagentStockStatus(r.currentStock, r.minSafeStock);
                const isSelected = selectedReagent?.id === r.id;

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedReagent(r)}
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

        <div className="lg:col-span-2">
          {selectedReagent ? (
            <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedReagent.name}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>
                      CAS 번호:{' '}
                      <strong className="font-mono text-slate-700">{selectedReagent.casNumber}</strong>
                    </span>
                    {selectedReagent.formula && (
                      <span>
                        화학식:{' '}
                        <strong className="font-mono text-slate-700">{selectedReagent.formula}</strong>
                      </span>
                    )}
                    {selectedReagent.isRegulatedPrecursor && (
                      <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
                        규제 원료물질 (전구체)
                      </span>
                    )}
                  </div>
                </div>
                {selectedReagent.msdsPdfUrl && (
                  <a
                    href={selectedReagent.msdsPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <FileText className="h-3.5 w-3.5 text-indigo-600" aria-hidden />
                    MSDS 열람
                  </a>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Boxes className="h-4 w-4 text-slate-500" aria-hidden />
                    보관 장소 및 캐비닛
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-900">
                    {selectedReagent.storageCabinetName}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
                    위험물 성상 분류
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedReagent.hazardClasses.map((h) => (
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
                    안전 기준: {selectedReagent.minSafeStock.toLocaleString()} {selectedReagent.unit}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">
                    {selectedReagent.currentStock.toLocaleString()}
                  </span>
                  <span className="text-sm text-slate-500">{selectedReagent.unit}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
              {reagents.length === 0 ? '표시할 시약이 없습니다.' : '시약을 선택해주세요.'}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={checkOpen}
        onClose={() => setCheckOpen(false)}
        title="혼합보관 호환성 매트릭스 검사기"
        maxWidth="md"
      >
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
          <Button type="button" variant="secondary" size="sm" onClick={() => setCheckOpen(false)}>
            닫기
          </Button>
        </div>
      </Modal>
    </WorkPageFrame>
  );
};