import {
  type ChemicalReagent,
  type GhsPictogram,
  type HazardClass,
} from '../domain/hazardousSubstanceEngine';

/** 위험물 성상에 따른 기본 GHS 픽토그램 매핑 */
export function defaultGhsPictogramsForHazard(hazard: HazardClass): GhsPictogram[] {
  if (hazard === 'acid' || hazard === 'base') return ['GHS05_CORROSION'];
  if (hazard === 'flammable' || hazard === 'organic_solvent') return ['GHS02_FLAME'];
  if (hazard === 'toxic') return ['GHS06_SKULL'];
  return ['GHS07_EXCLAMATION'];
}

export function reagentToFormValues(reagent: ChemicalReagent) {
  return {
    name: reagent.name,
    formula: reagent.formula ?? '',
    casNumber: reagent.casNumber,
    hazardClass: (reagent.hazardClasses[0] ?? 'general') as HazardClass,
    storageCabinetName: reagent.storageCabinetName,
    currentStock: reagent.currentStock,
    minSafeStock: reagent.minSafeStock,
    unit: reagent.unit,
    msdsPdfUrl: reagent.msdsPdfUrl ?? '',
    isRegulatedPrecursor: reagent.isRegulatedPrecursor ?? false,
  };
}