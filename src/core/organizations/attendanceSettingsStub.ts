/**
 * EP_apps: 출결 capability 제거 후 WorkplaceSettings 호환용 최소 스텁.
 */
import type { ReactNode } from 'react';

export const PIN_ATTENDANCE_DIRECTOR_COPY = {
  settingsEnabled:
    '출결 모듈은 이 앱에서 제공하지 않습니다.',
  settingsDisabled:
    '출결 모듈은 이 앱에서 제공하지 않습니다.',
  settingsEnabledToast: '출결 설정이 저장되었습니다.',
  settingsDisabledToast: '출결 설정이 저장되었습니다.',
  helpHowTo: '출결 모듈은 이 앱에서 제공하지 않습니다.',
} as const;

export const PIN_ATTENDANCE_PARENT_COPY = {
  noticesEmptyHint: '게시된 알림이 없습니다.',
  helpSummary: '출결 알림은 이 앱에서 제공하지 않습니다.',
  helpHowTo: '출결 알림은 이 앱에서 제공하지 않습니다.',
} as const;

export function isAttendanceModuleEnabled(
  settings?: { features?: { attendance?: { enabled?: boolean } } } | null,
  _industry?: unknown
): boolean {
  return settings?.features?.attendance?.enabled === true;
}

export function withAttendanceModuleEnabled<T extends { features?: Record<string, unknown> }>(
  settings: T,
  enabled: boolean
): T {
  return {
    ...settings,
    features: {
      ...(settings.features ?? {}),
      attendance: { enabled },
    },
  };
}

/** 설정 UI용 — EP_apps에서는 숨김(null) */
export function AttendanceFeatureToggle(_props: {
  enabled: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
}): ReactNode {
  return null;
}
