import { useEffect } from 'react';

/**
 * useUnsavedChangesWarning
 * 작성 중인 폼에 저장되지 않은 변경사항이 있을 때 브라우저 닫기/새로고침을 방지합니다.
 * @param isDirty 변경사항 존재 여부
 * @param message 경고 메시지 (일부 브라우저는 보안상 기본 메시지로 대체함)
 */
export function useUnsavedChangesWarning(
  isDirty: boolean,
  message: string = '작성 중인 변경사항이 저장되지 않았습니다. 정말 페이지를 벗어나시겠습니까?'
) {
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, message]);
}
