import React from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import {
  HazardousSubstanceReagentFormFields,
  type ReagentFormFieldState,
} from './HazardousSubstanceReagentFormFields';

export type HazardousSubstanceReagentFormModalsProps = ReagentFormFieldState & {
  createOpen: boolean;
  editOpen: boolean;
  onCloseCreate: () => void;
  onCloseEdit: () => void;
  onCreateSubmit: (e: React.FormEvent) => void;
  onEditSubmit: (e: React.FormEvent) => void;
  createPending: boolean;
  editPending: boolean;
};

/** 시약 등록·수정 모달 */
export const HazardousSubstanceReagentFormModals: React.FC<HazardousSubstanceReagentFormModalsProps> = ({
  createOpen,
  editOpen,
  onCloseCreate,
  onCloseEdit,
  onCreateSubmit,
  onEditSubmit,
  createPending,
  editPending,
  ...formProps
}) => (
  <>
    <Modal isOpen={createOpen} onClose={onCloseCreate} title="신규 화학 시약 등록" maxWidth="md">
      <form onSubmit={onCreateSubmit} className="space-y-4">
        <HazardousSubstanceReagentFormFields {...formProps} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCloseCreate}>
            취소
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={createPending}>
            등록
          </Button>
        </div>
      </form>
    </Modal>

    <Modal isOpen={editOpen} onClose={onCloseEdit} title="시약 정보 수정" maxWidth="md">
      <form onSubmit={onEditSubmit} className="space-y-4">
        <HazardousSubstanceReagentFormFields {...formProps} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCloseEdit}>
            취소
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={editPending}>
            저장
          </Button>
        </div>
      </form>
    </Modal>
  </>
);