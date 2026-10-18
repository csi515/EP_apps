/**
 * Moa-v2 Dynamic Schema Form Modal (<AutoSchemaModal />).
 *
 * 선언적 CapabilitySetupSchema를 모달 팝업으로 감싸서
 * 사장님 대시보드나 설정 화면에서 1클릭으로 설정 입력 모달을 노출한다.
 */

import React from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import type { CapabilitySetupSchema } from '@/core/presets/types';
import { AutoSchemaForm, type AutoSchemaFormProps } from './AutoSchemaForm';

export interface AutoSchemaModalProps extends Omit<AutoSchemaFormProps, 'showTitleHeader' | 'onCancel'> {
  isOpen: boolean;
  onClose: () => void;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const AutoSchemaModal: React.FC<AutoSchemaModalProps> = ({
  isOpen,
  onClose,
  schema,
  maxWidth = 'md',
  onSuccess,
  ...formProps
}) => {
  const handleSuccess = (values: Record<string, unknown>) => {
    if (onSuccess) {
      onSuccess(values);
    }
    // 성공 시 모달 자동 닫기
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={schema.title}
      description={schema.description}
      maxWidth={maxWidth}
      intent="form"
    >
      <AutoSchemaForm
        schema={schema}
        showTitleHeader={false}
        onCancel={onClose}
        onSuccess={handleSuccess}
        {...formProps}
      />
    </Modal>
  );
};
