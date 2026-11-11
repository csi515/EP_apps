/**
 * 조직 settings에서 연구과제 setupSchema 값을 읽는다.
 * 온보딩 키: research_project_<fieldId> / nested research_project 객체 모두 지원.
 */

export type ResearchProjectRuntimeSettings = {
  defaultGateCount: number;
  requireCoLead: boolean;
  blockOverspend: boolean;
};

const DEFAULTS: ResearchProjectRuntimeSettings = {
  defaultGateCount: 3,
  requireCoLead: false,
  blockOverspend: true,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toPositiveInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.min(10, Math.floor(value));
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return Math.min(10, Math.floor(n));
  }
  return fallback;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return fallback;
}

export function readResearchProjectSettings(
  settings: Record<string, unknown> | null | undefined
): ResearchProjectRuntimeSettings {
  const root = settings ?? {};
  const nested =
    asRecord(root.research_project) ||
    asRecord(asRecord(root.capability_setup)?.research_project) ||
    {};

  return {
    defaultGateCount: toPositiveInt(
      nested.default_gate_count ?? root.research_project_default_gate_count,
      DEFAULTS.defaultGateCount
    ),
    requireCoLead: toBoolean(
      nested.require_co_lead ?? root.research_project_require_co_lead,
      DEFAULTS.requireCoLead
    ),
    blockOverspend: toBoolean(
      nested.block_overspend ?? root.research_project_block_overspend,
      DEFAULTS.blockOverspend
    ),
  };
}
