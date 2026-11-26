import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useCreate, useUpdate } from '@refinedev/core';
import {
  HAZARD_CLASS_LABELS,
  checkStorageCompatibility,
  validateCasNumber,
  type ChemicalReagent,
  type HazardClass,
} from '../domain/hazardousSubstanceEngine';
import { defaultGhsPictogramsForHazard, reagentToFormValues } from './hazardousSubstanceViewForm';
import {
  mapReagentFormToHazardousSubstanceRowValues,
  useHazardousSubstanceReagents,
} from '../hooks/useHazardousSubstanceReagents';
import { HAZARDOUS_SUBSTANCE_REAGENT_RESOURCE } from '../persistence';
import { showToast } from '@/shared/feedback/uiFeedback';
import type { ReagentFormFieldState } from './HazardousSubstanceReagentFormFields';

/** 유해화학 MSDS 대장 화면 상태·제출 로직 */
export function useHazardousSubstanceManagementModel() {
  const { reagents, persistenceEnabled, isLoading, isError, refetch } = useHazardousSubstanceReagents();
  const { mutate: createReagent, mutation: createMutation } = useCreate();
  const { mutate: updateReagent, mutation: updateMutation } = useUpdate();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReagent, setSelectedReagent] = useState<ChemicalReagent | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formFormula, setFormFormula] = useState('');
  const [formCas, setFormCas] = useState('');
  const [formHazard, setFormHazard] = useState<HazardClass>('general');
  const [formCabinet, setFormCabinet] = useState('');
  const [formStock, setFormStock] = useState(1000);
  const [formMinStock, setFormMinStock] = useState(300);
  const [formUnit, setFormUnit] = useState('mL');
  const [formMsdsUrl, setFormMsdsUrl] = useState('');
  const [formRegulatedPrecursor, setFormRegulatedPrecursor] = useState(false);

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

  const resetForm = () => {
    setFormName('');
    setFormFormula('');
    setFormCas('');
    setFormHazard('general');
    setFormCabinet('');
    setFormStock(1000);
    setFormMinStock(300);
    setFormUnit('mL');
    setFormMsdsUrl('');
    setFormRegulatedPrecursor(false);
  };

  const openCreateModal = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEditModal = () => {
    if (!selectedReagent) return;
    const v = reagentToFormValues(selectedReagent);
    setFormName(v.name);
    setFormFormula(v.formula);
    setFormCas(v.casNumber);
    setFormHazard(v.hazardClass);
    setFormCabinet(v.storageCabinetName);
    setFormStock(v.currentStock);
    setFormMinStock(v.minSafeStock);
    setFormUnit(v.unit);
    setFormMsdsUrl(v.msdsPdfUrl);
    setFormRegulatedPrecursor(v.isRegulatedPrecursor);
    setEditOpen(true);
  };

  const buildFormPayload = () =>
    mapReagentFormToHazardousSubstanceRowValues({
      name: formName,
      formula: formFormula || undefined,
      casNumber: formCas,
      hazardClasses: [formHazard],
      ghsPictograms: defaultGhsPictogramsForHazard(formHazard),
      storageCabinetId: formCabinet.trim() ? `cab-${formCabinet.trim().replace(/\s+/g, '-').toLowerCase()}` : undefined,
      storageCabinetName: formCabinet,
      currentStock: Number(formStock) || 0,
      minSafeStock: Number(formMinStock) || 0,
      unit: formUnit,
      msdsPdfUrl: formMsdsUrl.trim() || null,
      isRegulatedPrecursor: formRegulatedPrecursor,
    });

  const validateForm = (): boolean => {
    if (!formName.trim()) {
      showToast('시약명을 입력해 주세요.', 'warning');
      return false;
    }
    const casVal = validateCasNumber(formCas);
    if (!casVal.isValid) {
      showToast(casVal.error || 'CAS 등록번호를 확인해 주세요.', 'error');
      return false;
    }
    return true;
  };

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!persistenceEnabled) return;
    if (!validateForm()) return;

    createReagent(
      {
        resource: HAZARDOUS_SUBSTANCE_REAGENT_RESOURCE,
        values: buildFormPayload(),
      },
      {
        onSuccess: () => {
          showToast('시약이 등록되었습니다.', 'success');
          setCreateOpen(false);
          resetForm();
          void refetch();
        },
        onError: () => {
          showToast('시약 등록에 실패했습니다.', 'error');
        },
      },
    );
  };

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!persistenceEnabled || !selectedReagent) return;
    if (!validateForm()) return;

    updateReagent(
      {
        resource: HAZARDOUS_SUBSTANCE_REAGENT_RESOURCE,
        id: selectedReagent.id,
        values: buildFormPayload(),
      },
      {
        onSuccess: () => {
          showToast('시약 정보가 저장되었습니다.', 'success');
          setEditOpen(false);
          void refetch();
        },
        onError: () => {
          showToast('시약 수정에 실패했습니다.', 'error');
        },
      },
    );
  };

  const reagentFormProps: ReagentFormFieldState = {
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
  };

  return {
    reagents,
    persistenceEnabled,
    isLoading,
    isError,
    refetch,
    searchTerm,
    setSearchTerm,
    selectedReagent,
    setSelectedReagent,
    filteredReagents,
    checkOpen,
    setCheckOpen,
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
    openCreateModal,
    openEditModal,
    createOpen,
    setCreateOpen,
    editOpen,
    setEditOpen,
    reagentFormProps,
    handleCreateSubmit,
    handleEditSubmit,
    createMutation,
    updateMutation,
  };
}