/**
 * 검증 명령용 파사드.
 * calculateBabyAge만 { months, days } 객체 계약을 노출하고,
 * 단계 가이드·정산은 babyFoodLogic을 재수출한다.
 */
import {
  calculateBabyAgeParts,
  calculateSettlement,
  getBabyAgeInfo,
  getWeaningStageGuide,
  type BabyAgeParts,
  type SettlementResult,
  type WeaningStageGuide,
} from './babyFoodLogic';

export type { BabyAgeParts, SettlementResult, WeaningStageGuide };

/** 요청 명세 계약: 만 개월 + 경과 일수 */
export function calculateBabyAge(
  birthDate: string | Date,
  baseDate?: string | Date
): BabyAgeParts {
  return calculateBabyAgeParts(birthDate, baseDate);
}

export { calculateSettlement, getBabyAgeInfo, getWeaningStageGuide };
export {
  calculateBabyAge as calculateBabyAgeMonths,
  calculateBabyAgeParts,
} from './babyFoodLogic';
