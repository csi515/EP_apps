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

export type RndTab = 'projects' | 'equipment' | 'maintenance' | 'patents';

export const RND_TAB_PATH: Record<RndTab, string> = {
  projects: '/rnd/projects',
  equipment: '/rnd/equipment',
  maintenance: '/rnd/maintenance',
  patents: '/rnd/patents',
};

export const RND_TAB_LABEL: Record<RndTab, string> = {
  projects: '연구 프로젝트',
  equipment: '연구 장비·예약',
  maintenance: '설비 점검',
  patents: '특허 관리',
};

export function isRndTabEnabled(tab: RndTab, enabledCaps: readonly string[]): boolean {
  switch (tab) {
    case 'projects':
      return enabledCaps.includes('research_project');
    case 'equipment':
      return (
        enabledCaps.includes('equipment_lifecycle') ||
        enabledCaps.includes('booking') ||
        enabledCaps.includes('seat_room') ||
        enabledCaps.includes('task_pipeline')
      );
    case 'maintenance':
      return enabledCaps.includes('maintenance_checklist');
    case 'patents':
      return enabledCaps.includes('patent_ip_asset');
    default:
      return false;
  }
}

export function resolveRndTabFromPath(pathname: string): RndTab | null {
  const hit = (Object.entries(RND_TAB_PATH) as [RndTab, string][]).find(([, path]) =>
    pathname === path || pathname.startsWith(`${path}/`),
  );
  return hit?.[0] ?? null;
}
