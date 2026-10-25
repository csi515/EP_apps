import { useCallback } from 'react';
import { feedbackStore } from './feedbackStore';
import type { ConfirmDialogOptions } from './confirmTypes';

export interface ConfirmDialogAsyncOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

/**
 * useConfirmDialog
 * window.confirm() 대신 모던한 다이얼로그를 Promise 기반(async/await)으로 호출할 수 있는 훅입니다.
 * 
 * 사용 예시:
 * const confirm = useConfirmDialog();
 * const ok = await confirm({
 *   title: '수강생 삭제',
 *   message: '정말 삭제하시겠습니까? 복구할 수 없습니다.',
 *   isDestructive: true
 * });
 * if (ok) {
 *   // 삭제 진행
 * }
 */
export function useConfirmDialog() {
  const confirm = useCallback((options: ConfirmDialogAsyncOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      const dialogOptions: ConfirmDialogOptions = {
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || '확인',
        cancelText: options.cancelText || '취소',
        isDestructive: options.isDestructive ?? false,
        onConfirm: () => {
          resolve(true);
        },
        onCancel: () => {
          resolve(false);
        },
      };

      feedbackStore.openConfirmDialog(dialogOptions);
    });
  }, []);

  return confirm;
}
