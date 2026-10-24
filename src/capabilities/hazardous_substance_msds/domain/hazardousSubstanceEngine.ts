/**
 * 유해화학물질 및 시약 MSDS 순수 도메인 엔진
 *
 * 연안법, 화평법, 화관법 준수:
 * - CAS 등록번호 형식 및 체크섬 검증
 * - 화학물질 성상별 혼합보관(Incompatible Storage) 금지 규칙 판정
 * - GHS 경고표지 및 MSDS 비치 여부 관리
 * - 위험물 최소 안전재고 판정 및 수불부/폐액 발생량 집계
 */

export type HazardClass =
  | 'acid'            // 강산 / 약산
  | 'base'            // 강염기 / 약염기
  | 'oxidizer'        // 산화성 물질 (과산화물 등)
  | 'flammable'       // 인화성 / 가연성 액체·고체
  | 'toxic'           // 급성독성 / 유독물질
  | 'pyrophoric'      // 자연발화성 물질
  | 'water_reactive'  // 물반응성 / 금수성 물질
  | 'organic_solvent' // 유기용매
  | 'general';        // 일반 시약

export type GhsPictogram =
  | 'GHS01_EXPLODING_BOMB'
  | 'GHS02_FLAME'
  | 'GHS03_FLAME_OVER_CIRCLE'
  | 'GHS04_GAS_CYLINDER'
  | 'GHS05_CORROSION'
  | 'GHS06_SKULL'
  | 'GHS07_EXCLAMATION'
  | 'GHS08_HEALTH_HAZARD'
  | 'GHS09_ENVIRONMENT';

export const HAZARD_CLASS_LABELS: Record<HazardClass, string> = {
  acid: '산성 (Acid)',
  base: '염기성 (Base)',
  oxidizer: '산화성 (Oxidizer)',
  flammable: '인화성 (Flammable)',
  toxic: '독성/유독물 (Toxic)',
  pyrophoric: '자연발화성 (Pyrophoric)',
  water_reactive: '물반응성 (Water Reactive)',
  organic_solvent: '유기용매 (Organic Solvent)',
  general: '일반 시약 (General)',
};

export interface ChemicalReagent {
  id: string;
  name: string; // 예: 황산 (Sulfuric acid), 에탄올 (Ethanol)
  formula?: string; // 예: H2SO4, C2H5OH
  casNumber: string; // 예: 7664-93-9
  hazardClasses: HazardClass[];
  ghsPictograms: GhsPictogram[];
  storageCabinetId: string; // 보관 캐비닛/시약장 식별자
  storageCabinetName: string; // 예: "내화방폭 시약장 C-01"
  currentStock: number;
  minSafeStock: number;
  unit: string; // 'mL', 'L', 'g', 'kg'
  msdsPdfUrl?: string | null;
  isRegulatedPrecursor?: boolean; // 규제 대상 원료물질 여부
  expirationDate?: string | null; // 유효기간 YYYY-MM-DD
}

export interface ChemicalUsageRecord {
  id: string;
  reagentId: string;
  reagentName: string;
  usedAt: string; // YYYY-MM-DD
  userId: string;
  userName: string;
  usedAmount: number;
  purpose: string; // 실험 목적 / 과제명
  wasteGeneratedAmount?: number; // 폐액 발생량
  wasteCategory?: 'acid_waste' | 'base_waste' | 'organic_waste' | 'heavy_metal_waste';
}

/**
 * CAS 등록번호 유효성 검증 (형식: X-Y-Z)
 * 마지막 자리 Z는 체크섬: sum(i * digit) mod 10
 */
export function validateCasNumber(cas: string): { isValid: boolean; error?: string } {
  const trimmed = cas.trim();
  const match = trimmed.match(/^(\d{2,7})-(\d{2})-(\d{1})$/);
  if (!match) {
    return { isValid: false, error: 'CAS 등록번호 형식이 올바르지 않습니다 (예: 67-64-1, 7664-93-9).' };
  }

  const digits = (match[1] + match[2]).split('').map(Number);
  const checkDigit = Number(match[3]);

  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const weight = digits.length - i;
    sum += digits[i] * weight;
  }

  const expectedCheckDigit = sum % 10;
  if (expectedCheckDigit !== checkDigit) {
    return {
      isValid: false,
      error: `CAS 등록번호 체크섬이 일치하지 않습니다. (기대값: ${expectedCheckDigit}, 입력값: ${checkDigit})`,
    };
  }

  return { isValid: true };
}

export interface CompatibilityCheckResult {
  isCompatible: boolean;
  hazardReason?: string;
}

/**
 * 화학물질 안전 보관 호환성 매트릭스 검증
 * 산·염기 분리, 산화제·가연물 분리, 물반응성 물질 격리
 */
export function checkStorageCompatibility(
  itemA: Pick<ChemicalReagent, 'name' | 'hazardClasses'>,
  itemB: Pick<ChemicalReagent, 'name' | 'hazardClasses'>
): CompatibilityCheckResult {
  const classesA = new Set(itemA.hazardClasses);
  const classesB = new Set(itemB.hazardClasses);

  // 1. 산(Acid)과 염기(Base) 혼합 보관 금지 (발열 중화 반응 및 용기 파손 위험)
  if (
    (classesA.has('acid') && classesB.has('base')) ||
    (classesA.has('base') && classesB.has('acid'))
  ) {
    return {
      isCompatible: false,
      hazardReason: `[위험] 산성 물질(${itemA.name})과 염기성 물질(${itemB.name})은 급격한 중화 발열 반응 위험으로 동일 캐비닛에 혼합 보관할 수 없습니다.`,
    };
  }

  // 2. 산화제(Oxidizer)와 인화성/유기용매(Flammable / Solvent) 혼합 보관 금지 (폭발 및 화재)
  const isOxidizerA = classesA.has('oxidizer');
  const isOxidizerB = classesB.has('oxidizer');
  const isCombustibleA = classesA.has('flammable') || classesA.has('organic_solvent');
  const isCombustibleB = classesB.has('flammable') || classesB.has('organic_solvent');

  if ((isOxidizerA && isCombustibleB) || (isCombustibleA && isOxidizerB)) {
    return {
      isCompatible: false,
      hazardReason: `[위험] 강산화제(${itemA.name})와 인화성/유기물(${itemB.name})은 접촉 시 폭발 및 자연발화 위험이 있어 분리 격리해야 합니다.`,
    };
  }

  // 3. 물반응성/자연발화성과 수용성 물질 혼합 금지
  const isWaterReactiveA = classesA.has('water_reactive') || classesA.has('pyrophoric');
  const isWaterReactiveB = classesB.has('water_reactive') || classesB.has('pyrophoric');

  if (isWaterReactiveA && classesB.has('acid')) {
    return {
      isCompatible: false,
      hazardReason: `[위험] 물반응성/자연발화성 물질(${itemA.name})은 산성 수용액(${itemB.name})과 엄격히 격리해야 합니다.`,
    };
  }
  if (isWaterReactiveB && classesA.has('acid')) {
    return {
      isCompatible: false,
      hazardReason: `[위험] 물반응성/자연발화성 물질(${itemB.name})은 산성 수용액(${itemA.name})과 엄격히 격리해야 합니다.`,
    };
  }

  return { isCompatible: true };
}

/**
 * 시약 재고 수준 상태 판정
 */
export function calculateReagentStockStatus(
  currentStock: number,
  minSafeStock: number
): 'critical' | 'warning' | 'normal' {
  if (currentStock <= 0) return 'critical';
  if (currentStock < minSafeStock) return 'warning';
  return 'normal';
}

/**
 * 시약 사용 및 폐액 발생 통계 집계
 */
export function aggregateChemicalUsage(records: ChemicalUsageRecord[]): {
  totalUsageCount: number;
  totalWasteAmount: number;
  wasteByCategory: Record<string, number>;
} {
  let totalWasteAmount = 0;
  const wasteByCategory: Record<string, number> = {};

  for (const r of records) {
    if (r.wasteGeneratedAmount && r.wasteGeneratedAmount > 0) {
      totalWasteAmount += r.wasteGeneratedAmount;
      const cat = r.wasteCategory ?? 'other_waste';
      wasteByCategory[cat] = (wasteByCategory[cat] ?? 0) + r.wasteGeneratedAmount;
    }
  }

  return {
    totalUsageCount: records.length,
    totalWasteAmount,
    wasteByCategory,
  };
}
