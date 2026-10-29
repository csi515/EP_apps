import type { ConfirmDialogOptions } from './confirmTypes';
import { feedbackStore } from './feedbackStore';
import {
  sanitizeErrorToastMessage,
  userFacingErrorMessage,
} from '@/shared/errors/userFacingError';

export type ShowToast = (
  message: string,
  type?: 'success' | 'error' | 'info' | 'warning',
  title?: string
) => void;

type UiFeedbackApi = {
  triggerRefresh: () => void;
};

function unbound(): never {
  throw new Error('UI feedback triggerRefresh is not bound. Render inside AppProvider.');
}

let api: UiFeedbackApi = {
  triggerRefresh: unbound,
};

/** AppProvider가 triggerRefresh를 연결합니다. */
export function bindUiFeedback(next: UiFeedbackApi) {
  api = next;
}

export function unbindUiFeedback() {
  api = {
    triggerRefresh: unbound,
  };
}

export function showToast(
  message: string,
  type?: 'success' | 'error' | 'info' | 'warning',
  title?: string
) {
  const body = type === 'error' ? sanitizeErrorToastMessage(message) : message;
  const heading =
    type === 'error' && title ? sanitizeErrorToastMessage(title) : title;
  feedbackStore.showToast(body, type, heading);
}

/**
 * 예외 객체(Error, PostgREST 에러, 네트워크 오류 등)를 분석하여
 * 사용자에게 친절하고 표준화된 한국어 에러 토스트를 표시합니다.
 */
export function showErrorToast(error: unknown, fallbackTitle?: string) {
  const message = userFacingErrorMessage(error);
  feedbackStore.showToast(message, 'error', fallbackTitle);
}

export function openConfirmDialog(options: ConfirmDialogOptions) {
  feedbackStore.openConfirmDialog(options);
}

export function triggerRefresh() {
  api.triggerRefresh();
}
