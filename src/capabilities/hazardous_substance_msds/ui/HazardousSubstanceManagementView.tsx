import React from 'react';
import { FlaskConical, AlertTriangle, ShieldAlert, Plus } from 'lucide-react';
import { HazardousSubstanceCompatibilityModal } from './HazardousSubstanceCompatibilityModal';
import { HazardousSubstanceReagentDetailPanel } from './HazardousSubstanceReagentDetailPanel';
import { HazardousSubstanceReagentListPanel } from './HazardousSubstanceReagentListPanel';
import { HazardousSubstanceReagentFormModals } from './HazardousSubstanceReagentFormModals';
import { useHazardousSubstanceManagementModel } from './useHazardousSubstanceManagementModel';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import { Button } from '@/shared/components/ui/Button';

const HAZARDOUS_SUBSTANCE_COPY = {
  persistenceBannerTitle: '서버 저장 미연동',
  persistenceBannerBody:
    '시약·MSDS 대장은 아직 데이터베이스에 연결되지 않았습니다. 목록은 비어 있으며 등록·수정은 스키마 마이그레이션 후 이용할 수 있습니다.',
  emptyTitle: '등록된 시약이 없습니다',
  emptyDescriptionLinked: '시약을 등록하면 조직별 MSDS 대장이 이곳에 표시됩니다.',
  emptyDescriptionOffline: '데이터 연동 후 조직별 시약·MSDS 목록이 이곳에 표시됩니다.',
  loadError: '시약 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
};

export const HazardousSubstanceManagementView: React.FC = () => {
  const model = useHazardousSubstanceManagementModel();

  return (
    <WorkPageFrame width="hub">
      {!model.persistenceEnabled && (
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => model.setCheckOpen(true)}
            className="gap-1.5"
          >
            <ShieldAlert className="h-4 w-4 text-rose-500" aria-hidden />
            혼합보관 호환성 검사
          </Button>
          {model.persistenceEnabled && (
            <Button type="button" variant="primary" size="sm" onClick={model.openCreateModal} className="gap-1.5">
              <Plus className="h-4 w-4" aria-hidden />
              시약 등록
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <HazardousSubstanceReagentListPanel
          searchTerm={model.searchTerm}
          onSearchChange={model.setSearchTerm}
          isLoading={model.isLoading}
          isError={model.isError}
          onRefetch={() => {
            void model.refetch();
          }}
          filteredReagents={model.filteredReagents}
          selectedReagentId={model.selectedReagent?.id}
          onSelectReagent={model.setSelectedReagent}
          persistenceEnabled={model.persistenceEnabled}
          onOpenCreate={model.openCreateModal}
          copy={HAZARDOUS_SUBSTANCE_COPY}
        />

        <div className="lg:col-span-2">
          {model.selectedReagent ? (
            <HazardousSubstanceReagentDetailPanel
              reagent={model.selectedReagent}
              persistenceEnabled={model.persistenceEnabled}
              onEdit={model.openEditModal}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
              {model.reagents.length === 0 ? '표시할 시약이 없습니다.' : '시약을 선택해주세요.'}
            </div>
          )}
        </div>
      </div>

      <HazardousSubstanceCompatibilityModal
        isOpen={model.checkOpen}
        onClose={() => model.setCheckOpen(false)}
        reagents={model.reagents}
        useInventoryCompatibility={model.useInventoryCompatibility}
        compAId={model.compAId}
        setCompAId={model.setCompAId}
        compBId={model.compBId}
        setCompBId={model.setCompBId}
        compAHazard={model.compAHazard}
        setCompAHazard={model.setCompAHazard}
        compBHazard={model.compBHazard}
        setCompBHazard={model.setCompBHazard}
        compResult={model.compResult}
      />

      <HazardousSubstanceReagentFormModals
        {...model.reagentFormProps}
        createOpen={model.createOpen}
        editOpen={model.editOpen}
        onCloseCreate={() => model.setCreateOpen(false)}
        onCloseEdit={() => model.setEditOpen(false)}
        onCreateSubmit={model.handleCreateSubmit}
        onEditSubmit={model.handleEditSubmit}
        createPending={model.createMutation.isPending}
        editPending={model.updateMutation.isPending}
      />
    </WorkPageFrame>
  );
};