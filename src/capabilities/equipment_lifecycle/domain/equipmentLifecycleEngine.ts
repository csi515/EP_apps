export type EquipmentUrgencyLevel = 'good' | 'due_soon' | 'overdue' | 'breakdown';

export interface EquipmentAsset {
  id: string;
  name: string; // 예: "필라테스 리포머 1호기", "에스프레소 머신 라마르조코", "정비 리프트 1번"
  category: string; // "fitness", "cafe", "auto", "facility"
  purchaseCost: number; // 취득 원가 (예: 5,000,000원)
  usefulLifeMonths: number; // 내용연수 (개월 수, 예: 60개월 = 5년)
  installedDate: string; // ISO
  lastMaintenanceDate: string; // ISO
  maintenanceIntervalMonths: number; // 정기 점검/부품 교체 주기 (개월)
  cumulativeRepairCost: number; // 누적 수리 및 유지보수 비용
  status: EquipmentUrgencyLevel;
  breakdownNotes?: string;
}

export interface RepairVsReplaceDecision {
  currentBookValue: number; // 잔존 장부가액 (정액법)
  depreciationMonthsElapsed: number; // 경과 개월 수
  repairCostRatioPercent: number; // 누적 수리비 / 취득원가 비율 (%)
  recommendation: 'maintain_repair' | 'recommend_replacement'; // 수리 권장 vs 신규 교체 권장
  recommendationReason: string;
}

/**
 * 정액법 감가상각 및 누적 수리비 비율을 계산하여 수리 vs 신규 교체 판정을 내립니다.
 */
export function evaluateRepairVsReplaceDecision(
  asset: EquipmentAsset,
  asOfDate: string = new Date().toISOString()
): RepairVsReplaceDecision {
  const startDate = new Date(asset.installedDate);
  const currentDate = new Date(asOfDate);
  const monthsElapsed = Math.max(
    0,
    (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
      (currentDate.getMonth() - startDate.getMonth())
  );

  // 정액법 감가상각 (잔존가치 10% 가정)
  const salvageValue = Math.round(asset.purchaseCost * 0.1);
  const depreciableAmount = asset.purchaseCost - salvageValue;
  const monthlyDepreciation = depreciableAmount / Math.max(1, asset.usefulLifeMonths);

  const accumulatedDepreciation = Math.min(
    depreciableAmount,
    Math.round(monthlyDepreciation * monthsElapsed)
  );
  const currentBookValue = Math.max(
    salvageValue,
    asset.purchaseCost - accumulatedDepreciation
  );

  const repairRatio = Math.round((asset.cumulativeRepairCost / asset.purchaseCost) * 100);

  let recommendation: 'maintain_repair' | 'recommend_replacement' = 'maintain_repair';
  let reason = '누적 수리비가 취득 원가 대비 안정적인 수준으로 추가 수리 및 유지가 경제적입니다.';

  if (repairRatio >= 50 || monthsElapsed >= asset.usefulLifeMonths) {
    recommendation = 'recommend_replacement';
    reason = `누적 수리비가 취득원가의 ${repairRatio}%에 도달했거나 내용연수(${asset.usefulLifeMonths}개월)가 만료되어 신규 장비 교체가 유리합니다.`;
  }

  return {
    currentBookValue,
    depreciationMonthsElapsed: monthsElapsed,
    repairCostRatioPercent: repairRatio,
    recommendation,
    recommendationReason: reason,
  };
}

/**
 * 다음 정기 점검 기한을 바탕으로 점검 긴급도를 평가합니다.
 */
export function evaluateEquipmentUrgency(
  asset: EquipmentAsset,
  asOfDate: string = new Date().toISOString()
): EquipmentUrgencyLevel {
  if (asset.status === 'breakdown') return 'breakdown';

  const lastMaint = new Date(asset.lastMaintenanceDate).getTime();
  const nextDueDate = lastMaint + asset.maintenanceIntervalMonths * 30.4375 * 24 * 3600 * 1000;
  const now = new Date(asOfDate).getTime();

  const daysLeft = Math.round((nextDueDate - now) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 14) return 'due_soon';
  return 'good';
}

/**
 * 직원이 현장 태블릿에서 기구 고장을 즉각 신고 접수합니다.
 */
export function reportEquipmentBreakdown(
  asset: EquipmentAsset,
  notes: string
): EquipmentAsset {
  return {
    ...asset,
    status: 'breakdown',
    breakdownNotes: notes.trim(),
  };
}
