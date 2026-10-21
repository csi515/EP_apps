import { getIndustryPreset } from '@/app/presets/presetRegistry';

export function resolveRndEnabledCapabilities(
  industryType: string | null | undefined,
  settings: Record<string, unknown> | null | undefined,
  activeCapabilities: readonly string[],
): string[] {
  const preset = industryType ? getIndustryPreset(industryType) : null;
  const base = (preset?.capabilities ?? []) as string[];
  const addons = (settings?.custom_addons as string[] | undefined) ?? [];
  const hidden = new Set((settings?.hidden_capabilities as string[] | undefined) ?? []);
  const required = new Set((preset?.requiredCapabilities ?? []) as string[]);
  const combined = new Set<string>([...base, ...activeCapabilities, ...addons]);
  return Array.from(combined).filter((cap) => required.has(cap) || !hidden.has(cap));
}

export type RndTab = 'projects' | 'equipment' | 'patents';

export function isRndTabEnabled(tab: RndTab, enabledCaps: readonly string[]): boolean {
  switch (tab) {
    case 'projects':
      return enabledCaps.includes('research_project');
    case 'equipment':
      return (
        enabledCaps.includes('equipment_lifecycle') ||
        enabledCaps.includes('booking') ||
        enabledCaps.includes('seat_room') ||
        enabledCaps.includes('maintenance_checklist') ||
        enabledCaps.includes('task_pipeline')
      );
    case 'patents':
      return enabledCaps.includes('patent_ip_asset');
    default:
      return false;
  }
}
