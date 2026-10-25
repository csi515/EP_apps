import { useEffect } from 'react';

export interface HotkeyBinding {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  preventDefault?: boolean;
  callback: (e: KeyboardEvent) => void;
  description?: string;
}

/**
 * useGlobalHotkeys
 * 단축키 목록을 등록하여 글로벌 키다운 이벤트를 바인딩합니다.
 * @param bindings 단축키 설정 목록
 * @param enabled 활성화 여부
 */
export function useGlobalHotkeys(bindings: HotkeyBinding[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 텍스트 입력 중일 때는 기본적으로 Alt/Ctrl 조합이 아닌 일반 단일 키 입력을 무시할 수 있도록 처리
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      for (const binding of bindings) {
        const matchesKey = e.key.toLowerCase() === binding.key.toLowerCase();
        const matchesCtrl = Boolean(binding.ctrlKey) === (e.ctrlKey || e.metaKey);
        const matchesAlt = Boolean(binding.altKey) === e.altKey;
        const matchesShift = Boolean(binding.shiftKey) === e.shiftKey;

        // 일반 텍스트 입력 중이고 모디파이어(Ctrl/Alt)가 없는 경우 스킵
        if (isInput && !binding.ctrlKey && !binding.altKey) {
          continue;
        }

        if (matchesKey && matchesCtrl && matchesAlt && matchesShift) {
          if (binding.preventDefault !== false) {
            e.preventDefault();
          }
          binding.callback(e);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [bindings, enabled]);
}
