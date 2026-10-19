export const SUCCESS_VIBRATION = 50;
export const ERROR_VIBRATION = [100, 50, 100] as const;
export const SUCCESS_CHIME_HZ = [1046.5, 1567.98] as const;

type VibrateNavigator = Navigator & {
  vibrate?: (pattern: number | number[]) => boolean;
};

export function pulseSuccess(): void {
  const nav = navigator as VibrateNavigator;
  nav.vibrate?.(SUCCESS_VIBRATION);
}

export function pulseError(): void {
  const nav = navigator as VibrateNavigator;
  nav.vibrate?.([...ERROR_VIBRATION]);
}

export function playSuccessChime(): void {
  const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const context = new AudioCtx();
  const now = context.currentTime;
  SUCCESS_CHIME_HZ.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18 + index * 0.12);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + index * 0.12);
    oscillator.stop(now + 0.28 + index * 0.12);
  });
  window.setTimeout(() => void context.close(), 800);
}

export function celebrateSuccess(): void {
  pulseSuccess();
  playSuccessChime();
}
