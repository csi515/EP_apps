import type { IndustryCategory } from './categories';

type DefinedIndustry<T extends string> = {
  id: T;
  label: string;
  description: string;
  category: IndustryCategory;
  moduleId?: T;
  selectable?: boolean;
};

export type DefineIndustryInput<T extends string> = {
  id: T;
  label: string;
  description: string;
  category: IndustryCategory;
  moduleId?: T;
  selectable?: boolean;
};

type DefinitionSeed = {
  id: string;
  label: string;
  description: string;
  category: IndustryCategory;
  moduleId?: string;
  selectable?: boolean;
};

/** 객체 형태 — 전용 모듈 업종. catalog metadata만 선언한다. */
export function defineIndustry<T extends string>(input: DefineIndustryInput<T>): DefinedIndustry<T>;
/** 위치 인자 — 카탈로그 전용(모듈 없는) 업종 */
export function defineIndustry<T extends string>(
  id: T,
  label: string,
  description: string,
  category: IndustryCategory,
  moduleId?: T
): DefinedIndustry<T>;
export function defineIndustry<T extends string>(
  idOrInput: T | DefineIndustryInput<T>,
  label?: string,
  description?: string,
  category?: IndustryCategory,
  moduleId?: T
): DefinedIndustry<T> {
  if (typeof idOrInput === 'object') {
    return {
      id: idOrInput.id,
      label: idOrInput.label,
      description: idOrInput.description,
      category: idOrInput.category,
      moduleId: idOrInput.moduleId,
      selectable: idOrInput.selectable === true,
    };
  }
  return {
    id: idOrInput,
    label: label ?? '',
    description: description ?? '',
    category: category as IndustryCategory,
    moduleId,
    selectable: false,
  };
}

/**
 * EP_apps 업종 카탈로그 — personal_plant_ops 단일 프리셋.
 * runtime capability 조합은 `src/app/industry/industryCapabilityMap.ts`.
 */
const DEFINITION_LIST = [
  defineIndustry({
    id: 'personal_plant_ops',
    label: 'EP_apps',
    description: '소규모 현장용: 결재·안전·자재·공용자원·노경 건의·조직도·MBO·연구과제',
    category: 'other',
    selectable: true,
  }),
] as const satisfies readonly DefinitionSeed[];

export type IndustryType = (typeof DEFINITION_LIST)[number]['id'];

/**
 * 전용 업종 모듈 id.
 * EP_apps는 모듈이 없으므로 플레이스홀더만 두고 목록은 비운다.
 */
export type ModuleIndustryId = 'personal_plant_ops';

export const MODULE_INDUSTRY_IDS: readonly ModuleIndustryId[] = [];

/** Core catalog metadata. runtime capability 조합은 포함하지 않는다. */
export type IndustryCatalogMetadata = {
  id: IndustryType;
  label: string;
  description: string;
  category: IndustryCategory;
  moduleId?: ModuleIndustryId;
  selectable: boolean;
};

export type IndustryDefinition = IndustryCatalogMetadata;

export const INDUSTRY_IDS: IndustryType[] = DEFINITION_LIST.map((d) => d.id);

export const PUBLIC_SELECTABLE_INDUSTRY_IDS = DEFINITION_LIST.flatMap((d) =>
  d.selectable ? [d.id] : []
) as readonly IndustryType[];

export const INDUSTRY_DEFINITIONS = Object.fromEntries(
  DEFINITION_LIST.map((d) => [
    d.id,
    {
      id: d.id,
      label: d.label,
      description: d.description,
      category: d.category,
      selectable: d.selectable === true,
    } satisfies IndustryDefinition,
  ])
) as Record<IndustryType, IndustryDefinition>;

/** 구 값 → personal_plant_ops 호환 별칭 */
export const INDUSTRY_ALIASES: Record<string, IndustryType> = {
  personal_plant: 'personal_plant_ops',
  plant_ops: 'personal_plant_ops',
  ep_apps: 'personal_plant_ops',
  EP_apps: 'personal_plant_ops',
};
