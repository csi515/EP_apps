import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  FolderKanban,
  MessageSquare,
  Target,
  FlaskConical,
  Package,
} from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { getIndustryPreset } from '@/app/presets/presetRegistry';

type HubTile = {
  to: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  /** 비어 있으면 항상 표시 */
  requiredAnyCapability: readonly string[];
};

const HUB_TILES: HubTile[] = [
  {
    to: '/workspace/organization',
    label: '조직도·직급',
    description: '부서 트리, 스코프·직급 위임, 세션 즉시 파기',
    icon: <Building2 className="h-6 w-6" />,
    requiredAnyCapability: [],
  },
  {
    to: '/workspace/resources',
    label: '공용자원',
    description: '자원 카탈로그, 차량·회의실·비품 인스턴스',
    icon: <Package className="h-6 w-6" />,
    requiredAnyCapability: ['booking', 'seat_room', 'rental_equipment'],
  },
  {
    to: '/workspace/feedbacks',
    label: '사내 건의함',
    description: '기명·익명 접수, 전담자 답변',
    icon: <MessageSquare className="h-6 w-6" />,
    requiredAnyCapability: ['whistleblower_grievance'],
  },
  {
    to: '/workspace/mbo',
    label: 'MBO 점검',
    description: '목표 수정 이력, 부분 공개, 월별 점검',
    icon: <Target className="h-6 w-6" />,
    requiredAnyCapability: ['mbo'],
  },
  {
    to: '/rnd',
    label: '연구소 포털',
    description: '연구과제, 장비·예약, 특허',
    icon: <FlaskConical className="h-6 w-6" />,
    requiredAnyCapability: ['research_project', 'task_pipeline', 'patent_ip_asset', 'equipment_lifecycle'],
  },
  {
    to: '/workspace/settings/roles',
    label: '직급·권한 매트릭스',
    description: '동적 직급 및 JSONB 권한 설정',
    icon: <FolderKanban className="h-6 w-6" />,
    requiredAnyCapability: [],
  },
];

function resolveEnabledCaps(
  industryType: string | null | undefined,
  settings: Record<string, unknown> | null | undefined,
  activeCapabilities: readonly string[],
): string[] {
  const preset = industryType ? getIndustryPreset(industryType) : null;
  const base = (preset?.capabilities ?? []) as string[];
  const addons = (settings?.custom_addons as string[] | undefined) ?? [];
  return Array.from(new Set([...base, ...activeCapabilities, ...addons]));
}

export const WorkspaceIntranetHubPage: React.FC<{
  enabledCapabilityIds?: readonly string[];
}> = ({ enabledCapabilityIds }) => {
  const { currentOrganization, activeCapabilities } = useOrganization();
  const settings = (currentOrganization?.settings ?? null) as Record<string, unknown> | null;

  const enabledCaps = useMemo(() => {
    if (enabledCapabilityIds?.length) return [...enabledCapabilityIds];
    return resolveEnabledCaps(
      currentOrganization?.industry_type,
      settings,
      activeCapabilities ?? [],
    );
  }, [enabledCapabilityIds, currentOrganization?.industry_type, settings, activeCapabilities]);

  const visibleTiles = HUB_TILES.filter((tile) => {
    if (tile.requiredAnyCapability.length === 0) return true;
    return tile.requiredAnyCapability.some((cap) => enabledCaps.includes(cap));
  });

  return (
    <main className="mx-auto max-w-3xl p-4 pb-16">
      <h1 className="text-lg font-semibold text-slate-900">사내 업무 스위트</h1>
      <p className="mt-1 text-sm text-slate-600">
        조직·자원·건의·MBO·연구소 기능을 한곳에서 이동합니다.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {visibleTiles.map((tile) => (
          <li key={tile.to}>
            <Link
              to={tile.to}
              className="flex min-h-[4.5rem] gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                {tile.icon}
              </span>
              <span>
                <span className="block font-semibold text-slate-900">{tile.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{tile.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
};
