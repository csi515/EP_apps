/**
 * MBO 워크스페이스 액션용 toast·상태 라벨 헬퍼
 */

import type { MboStatus } from '../domain/mboEngine';
import { showToast } from '@/shared/feedback/uiFeedback';
import { MBO_COPY } from '../ui/mboUiCopy';

export function statusLabelKo(status: MboStatus): string {
  return MBO_COPY.statusLabel[status] ?? status;
}

export function toastError(err: unknown, fallback: string): void {
  showToast(err instanceof Error ? err.message : fallback, 'error');
}

export function toastWarning(message: string): void {
  showToast(message, 'warning');
}

export function toastSuccess(message: string): void {
  showToast(message, 'success');
}

export function toastInfo(message: string): void {
  showToast(message, 'info');
}

/** mutate onError 콜백용 */
export function mutationErrorHandler(fallback: string) {
  return (err: unknown) => toastError(err, fallback);
}
