/**
 * USB 및 블루투스 1D/2D HID 바코드 및 QR 스캐너 연동 훅 & 사운드/햅틱 유틸
 */
import { useEffect, useRef, useCallback } from 'react';

/** Web Audio API를 활용한 무과금 즉각 비프음 발생기 */
export function playScannerSound(type: 'success' | 'error' = 'success'): void {
  try {
    const AudioContextClass =
      typeof window !== 'undefined'
        ? window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        : null;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'success') {
      // B5 (987.77Hz) 경쾌하고 깔끔한 계산대 비프음
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else {
      // 둔탁한 2단계 저음 경고음 (260Hz -> 180Hz)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.24);
    }
  } catch {
    // 오디오 컨텍스트 차단 환경 예외 안전 무시
  }
}

/** 햅틱 진동 피드백 */
export function triggerScannerHaptic(type: 'success' | 'error' = 'success'): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'success') {
        navigator.vibrate(20);
      } else {
        navigator.vibrate([100, 60, 100]);
      }
    } catch {
      // noop
    }
  }
}

/**
 * 윈도우 OS 한/영 키가 '한글' 상태일 때 2벌식 자모로 변환되어 들어오는 문자를 영문/숫자로 복원
 */
const KOREAN_TO_QWERTY_MAP: Record<string, string> = {
  // 초성/종성 자음
  ㄱ: 'r', ㄲ: 'R', ㄴ: 's', ㄷ: 'e', ㄸ: 'E', ㄹ: 'f',
  ㅁ: 'a', ㅂ: 'q', ㅃ: 'Q', ㅅ: 't', ㅆ: 'T', ㅇ: 'd',
  ㅈ: 'w', ㅉ: 'W', ㅊ: 'c', ㅋ: 'z', ㅌ: 'x', ㅍ: 'v', ㅎ: 'g',
  // 중성 모음
  ㅏ: 'k', ㅐ: 'o', ㅑ: 'i', ㅒ: 'O', ㅓ: 'j', ㅔ: 'p',
  ㅕ: 'u', ㅖ: 'P', ㅗ: 'h', ㅛ: 'y', ㅜ: 'n', ㅠ: 'b',
  ㅡ: 'm', ㅣ: 'l',
  // 복합 모음 분해
  ㅘ: 'hk', ㅙ: 'ho', ㅚ: 'hl', ㅝ: 'nj', ㅞ: 'np', ㅟ: 'nl', ㅢ: 'ml',
  // 복합 받침 분해
  ㄳ: 'rt', ㄵ: 'sw', ㄶ: 'sg', ㄺ: 'fr', ㄻ: 'fa', ㄼ: 'fq',
  ㄽ: 'ft', ㄾ: 'fx', ㄿ: 'fv', ㅀ: 'fg', ㅄ: 'qt',
};

/** 한글 조합 문자(가~힣)를 자모 분해 후 영문 알파벳으로 변환 */
export function normalizeScannedKoreanText(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);

    // 완성형 한글 음절 (가~힣)
    if (code >= 0xac00 && code <= 0xd7a3) {
      const syllableIndex = code - 0xac00;
      const initialIndex = Math.floor(syllableIndex / 588);
      const medialIndex = Math.floor((syllableIndex % 588) / 28);
      const finalIndex = syllableIndex % 28;

      const INITIALS = ['r', 'R', 's', 'e', 'E', 'f', 'a', 'q', 'Q', 't', 'T', 'd', 'w', 'W', 'c', 'z', 'x', 'v', 'g'];
      const MEDIALS = ['k', 'o', 'i', 'O', 'j', 'p', 'u', 'P', 'h', 'hk', 'ho', 'hl', 'y', 'n', 'nj', 'np', 'nl', 'b', 'm', 'ml', 'l'];
      const FINALS = ['', 'r', 'R', 'rt', 's', 'sw', 'sg', 'e', 'f', 'fr', 'fa', 'fq', 'ft', 'fx', 'fv', 'fg', 'a', 'q', 'qt', 't', 'T', 'd', 'w', 'c', 'z', 'x', 'v', 'g'];

      result += (INITIALS[initialIndex] || '') + (MEDIALS[medialIndex] || '') + (FINALS[finalIndex] || '');
    } else if (KOREAN_TO_QWERTY_MAP[char]) {
      result += KOREAN_TO_QWERTY_MAP[char];
    } else {
      result += char;
    }
  }
  return result;
}

export interface BarcodeScannerOptions {
  /** 바코드/QR 스캔 완료 시 호출되는 콜백 */
  onScan: (barcode: string) => void;
  /** 키 입력 간 최대 허용 시간 간격 (ms) — 기본값 50ms (사람 타이핑과 구분) */
  maxIntervalMs?: number;
  /** 유효 바코드 최소 길이 — 기본값 3자 */
  minLength?: number;
  /** 스캐너 활성화 여부 */
  enabled?: boolean;
  /** 스캔 성공 시 자동 비프음/진동 재생 여부 (기본 true) */
  feedbackOnScan?: boolean;
}

/**
 * 전역 키보드 이벤트를 감지하여 USB/블루투스 HID 바코드/QR 스캐너 입력을 처리하는 React 훅
 */
export function useBarcodeScanner({
  onScan,
  maxIntervalMs = 50,
  minLength = 3,
  enabled = true,
  feedbackOnScan = true,
}: BarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const isScannerBurstRef = useRef<boolean>(false);

  const handleScanComplete = useCallback(
    (rawCode: string) => {
      const normalized = normalizeScannedKoreanText(rawCode).trim();
      if (normalized.length >= minLength) {
        if (feedbackOnScan) {
          playScannerSound('success');
          triggerScannerHaptic('success');
        }
        onScan(normalized);
      }
    },
    [onScan, minLength, feedbackOnScan]
  );

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab, Escape 등 제어키는 스캐너 버퍼에서 무시
      if (e.key === 'Escape' || e.key === 'Tab') {
        bufferRef.current = '';
        isScannerBurstRef.current = false;
        return;
      }

      const now = performance.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // 직전 입력과의 간격이 긴 경우 버퍼 초기화 (일반 수동 타이핑)
      if (interval > maxIntervalMs) {
        bufferRef.current = '';
        isScannerBurstRef.current = false;
      } else {
        // 간격이 매우 짧으면 스캐너 입력으로 판정
        isScannerBurstRef.current = true;
      }

      // Enter 수신 시 (스캐너의 Suffix 종료 문자)
      if (e.key === 'Enter') {
        if (isScannerBurstRef.current && bufferRef.current.length >= minLength) {
          e.preventDefault();
          e.stopPropagation();
          const code = bufferRef.current;
          bufferRef.current = '';
          isScannerBurstRef.current = false;
          handleScanComplete(code);
          return;
        }
        bufferRef.current = '';
        isScannerBurstRef.current = false;
        return;
      }

      // 스캐너 폭주 입력 중인 경우 input 포커스 상태라도 기본 동작 차단(인풋에 글자 오염 방지)
      if (isScannerBurstRef.current && bufferRef.current.length >= 2) {
        const activeEl = document.activeElement;
        const isInputField =
          activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;
        if (isInputField) {
          // 인풋 필드에 바코드 번호가 연달아 박히는 것을 방지
          e.preventDefault();
        }
      }

      // 단일 문자 입력 수집 (Shift/Ctrl 등 제외)
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, maxIntervalMs, minLength, handleScanComplete]);
}
