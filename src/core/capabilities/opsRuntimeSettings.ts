/**
 * 온보딩 setupSchema 값을 조직 settings.ops_runtime 으로 읽어 엔진에 주입한다.
 */

export type OpsRuntimeSettings = {
  booking_buffer_minutes?: number;
  seat_capacity_default?: number;
  turnaround_buffer_minutes?: number;
  require_cleaning_checklist?: boolean;
  maintenance_reminder_hours?: number;
};

export function readOpsRuntimeSettings(settings: Record<string, unknown> | null | undefined): OpsRuntimeSettings {
  const raw = (settings?.ops_runtime ?? settings?.opsRuntime ?? {}) as Record<string, unknown>;
  return {
    booking_buffer_minutes: toPositiveInt(raw.booking_buffer_minutes) ?? toPositiveInt(settings?.booking_buffer_minutes),
    seat_capacity_default: toPositiveInt(raw.seat_capacity_default) ?? toPositiveInt(settings?.seat_capacity_default),
    turnaround_buffer_minutes:
      toPositiveInt(raw.turnaround_buffer_minutes) ?? toPositiveInt(settings?.turnaround_buffer_minutes) ?? 15,
    require_cleaning_checklist:
      typeof raw.require_cleaning_checklist === 'boolean'
        ? raw.require_cleaning_checklist
        : typeof settings?.require_cleaning_checklist === 'boolean'
          ? (settings.require_cleaning_checklist as boolean)
          : true,
    maintenance_reminder_hours: toPositiveInt(raw.maintenance_reminder_hours),
  };
}

export function mergeOpsRuntimeSettings(
  settings: Record<string, unknown>,
  patch: OpsRuntimeSettings,
): Record<string, unknown> {
  const current = readOpsRuntimeSettings(settings);
  return {
    ...settings,
    ops_runtime: {
      ...current,
      ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)),
    },
  };
}

function toPositiveInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return undefined;
}
