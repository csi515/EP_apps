/**
 * Core Multi-Location 본사-다지점 통합 관제 도메인 엔진 (Pure Functions)
 *
 * 주요 기능:
 *  1. 본사 전 지점 통합 KPI 매트릭스 집계 (매출, 객단가, 이용률, 지점 랭킹)
 *  2. 지점 간 재고 수평 이동(Inter-Branch Transfer) 원자적 전출/전입 전표 생성
 *  3. 멀티 지점 회원권 교차 이용(Cross-Branch Pass) 승인 및 지점 간 정산 분개
 */

export interface LocationKpiInput {
  locationId: string;
  locationName: string;
  grossSales: number; // 당월 매출액
  activeMembersCount: number; // 활성 회원 수
  transactionsCount: number; // 결제 건수
  capacitySlots: number; // 총 수용 가능 슬롯
  occupiedSlots: number; // 실제 가동/예약 슬롯
}

export interface LocationKpiItem extends LocationKpiInput {
  averageTicketPrice: number; // 객단가 (매출 / 건수)
  occupancyRatePercent: number; // 가동률 (%)
  salesRank: number; // 매출 순위
  salesSharePercent: number; // 본사 전체 매출 대비 비중 (%)
}

export interface HqConsolidationSummary {
  totalLocationsCount: number;
  totalGrossSales: number;
  totalActiveMembers: number;
  totalTransactions: number;
  averageOccupancyRatePercent: number;
  topPerformingLocationId: string;
  branches: LocationKpiItem[];
}

export type TransferStatus = 'requested' | 'in_transit' | 'received' | 'rejected';

export interface InterBranchTransferItem {
  sku: string;
  itemName: string;
  quantity: number;
  unitCost: number;
}

export interface InterBranchTransferOrder {
  transferId: string;
  fromLocationId: string;
  fromLocationName: string;
  toLocationId: string;
  toLocationName: string;
  requestDate: string; // YYYY-MM-DD
  items: InterBranchTransferItem[];
  totalQuantity: number;
  totalTransferCost: number;
  status: TransferStatus;
  receivedDate?: string;
  rejectionReason?: string;
}

export interface MemberPassScope {
  passId: string;
  memberId: string;
  memberName: string;
  homeLocationId: string; // 최초 발급/등록 지점 (홈 지점)
  homeLocationName: string;
  passType: 'single_location' | 'all_branches' | 'selected_branches';
  allowedLocationIds?: string[]; // selected_branches인 경우 허용 지점 목록
  remainingCredits: number; // 잔여 횟수
  validUntil: string; // 유효 만료일 (YYYY-MM-DD)
  interBranchSplitRatio: {
    homeSharePercent: number; // 홈 지점 수익 배분율 (예: 30%)
    visitingSharePercent: number; // 실제 이용 지점 수익 배분율 (예: 70%)
  };
}

export interface CrossBranchCheckInResult {
  isAuthorized: boolean;
  passId: string;
  memberId: string;
  targetLocationId: string;
  updatedRemainingCredits: number;
  failureReason?: string;
  settlementRecord?: {
    homeLocationId: string;
    visitingLocationId: string;
    settlementAmount: number;
    homeShareAmount: number;
    visitingShareAmount: number;
    settledDate: string;
  };
}

/**
 * 1. 전 지점의 운영 데이터를 집계하여 본사 통합 KPI 매트릭스 및 순위를 계산합니다.
 */
export function aggregateHqBranchKpis(branchesInput: LocationKpiInput[]): HqConsolidationSummary {
  if (branchesInput.length === 0) {
    return {
      totalLocationsCount: 0,
      totalGrossSales: 0,
      totalActiveMembers: 0,
      totalTransactions: 0,
      averageOccupancyRatePercent: 0,
      topPerformingLocationId: '',
      branches: [],
    };
  }

  const totalGrossSales = branchesInput.reduce((sum, b) => sum + b.grossSales, 0);
  const totalActiveMembers = branchesInput.reduce((sum, b) => sum + b.activeMembersCount, 0);
  const totalTransactions = branchesInput.reduce((sum, b) => sum + b.transactionsCount, 0);

  // 지점별 계산
  const calculatedItems = branchesInput.map((b) => {
    const avgTicket = b.transactionsCount > 0 ? Math.round(b.grossSales / b.transactionsCount) : 0;
    const occupancy = b.capacitySlots > 0 ? Math.round((b.occupiedSlots / b.capacitySlots) * 1000) / 10 : 0;
    const share = totalGrossSales > 0 ? Math.round((b.grossSales / totalGrossSales) * 1000) / 10 : 0;

    return {
      ...b,
      averageTicketPrice: avgTicket,
      occupancyRatePercent: occupancy,
      salesSharePercent: share,
      salesRank: 1, // 정렬 후 재할당
    };
  });

  // 매출 기준 내림차순 정렬 및 순위 부여
  calculatedItems.sort((a, b) => b.grossSales - a.grossSales);
  calculatedItems.forEach((item, index) => {
    item.salesRank = index + 1;
  });

  const avgOccupancy =
    calculatedItems.length > 0
      ? Math.round(
          (calculatedItems.reduce((sum, b) => sum + b.occupancyRatePercent, 0) / calculatedItems.length) * 10
        ) / 10
      : 0;

  return {
    totalLocationsCount: calculatedItems.length,
    totalGrossSales,
    totalActiveMembers,
    totalTransactions,
    averageOccupancyRatePercent: avgOccupancy,
    topPerformingLocationId: calculatedItems[0]?.locationId || '',
    branches: calculatedItems,
  };
}

/**
 * 2. 지점 간 재고 수평 이동 전표(Inter-Branch Transfer Order)를 생성합니다.
 */
export function createInterBranchTransferOrder(params: {
  fromLocationId: string;
  fromLocationName: string;
  toLocationId: string;
  toLocationName: string;
  requestDate: string;
  items: InterBranchTransferItem[];
}): InterBranchTransferOrder {
  const totalQty = params.items.reduce((sum, it) => sum + it.quantity, 0);
  const totalCost = params.items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0);

  return {
    transferId: `TRF-${Date.now().toString().slice(-6)}`,
    fromLocationId: params.fromLocationId,
    fromLocationName: params.fromLocationName,
    toLocationId: params.toLocationId,
    toLocationName: params.toLocationName,
    requestDate: params.requestDate,
    items: params.items,
    totalQuantity: totalQty,
    totalTransferCost: totalCost,
    status: 'in_transit', // 발송 즉시 이동 중
  };
}

/**
 * 3. 수신 지점에서 지점 간 재고 수령을 확정합니다.
 */
export function confirmInterBranchTransferReceipt(
  order: InterBranchTransferOrder,
  receivedDate: string = new Date().toISOString().split('T')[0]
): InterBranchTransferOrder {
  return {
    ...order,
    status: 'received',
    receivedDate,
  };
}

/**
 * 4. 타 지점 방문 회원의 회원권 교차 이용 승인 및 지점 간 정산 분개를 계산합니다.
 */
export function verifyAndProcessCrossBranchPassCheckIn(params: {
  pass: MemberPassScope;
  targetLocationId: string;
  sessionEstimatedValue?: number; // 1회 차감 환산가액 (예: 25,000원)
  asOfDate?: string;
}): CrossBranchCheckInResult {
  const { pass, targetLocationId, sessionEstimatedValue = 20000, asOfDate = new Date().toISOString().split('T')[0] } = params;

  // 1) 잔여 횟수 검증
  if (pass.remainingCredits <= 0) {
    return {
      isAuthorized: false,
      passId: pass.passId,
      memberId: pass.memberId,
      targetLocationId,
      updatedRemainingCredits: 0,
      failureReason: '잔여 이용권 횟수가 부족합니다.',
    };
  }

  // 2) 유효기간 검증
  if (asOfDate > pass.validUntil) {
    return {
      isAuthorized: false,
      passId: pass.passId,
      memberId: pass.memberId,
      targetLocationId,
      updatedRemainingCredits: pass.remainingCredits,
      failureReason: `이용권 유효기간(${pass.validUntil})이 만료되었습니다.`,
    };
  }

  // 3) 지점 교차 이용 권한 검증
  let isLocationAllowed = false;
  if (pass.passType === 'all_branches') {
    isLocationAllowed = true;
  } else if (pass.passType === 'single_location') {
    isLocationAllowed = pass.homeLocationId === targetLocationId;
  } else if (pass.passType === 'selected_branches') {
    isLocationAllowed =
      pass.homeLocationId === targetLocationId ||
      Boolean(pass.allowedLocationIds?.includes(targetLocationId));
  }

  if (!isLocationAllowed) {
    return {
      isAuthorized: false,
      passId: pass.passId,
      memberId: pass.memberId,
      targetLocationId,
      updatedRemainingCredits: pass.remainingCredits,
      failureReason: `해당 회원권은 등록 지점(${pass.homeLocationName}) 전용으로, 타 지점 교차 이용이 불가능합니다.`,
    };
  }

  // 4) 승인 및 잔여 횟수 1회 차감
  const updatedCredits = pass.remainingCredits - 1;

  // 5) 지점 간 내부 정산(수익 배분) 기록 생성
  const isVisitingDifferentBranch = pass.homeLocationId !== targetLocationId;
  let settlementRecord: CrossBranchCheckInResult['settlementRecord'];

  if (isVisitingDifferentBranch) {
    const homeShare = Math.round(sessionEstimatedValue * (pass.interBranchSplitRatio.homeSharePercent / 100));
    const visitingShare = sessionEstimatedValue - homeShare;

    settlementRecord = {
      homeLocationId: pass.homeLocationId,
      visitingLocationId: targetLocationId,
      settlementAmount: sessionEstimatedValue,
      homeShareAmount: homeShare,
      visitingShareAmount: visitingShare,
      settledDate: asOfDate,
    };
  }

  return {
    isAuthorized: true,
    passId: pass.passId,
    memberId: pass.memberId,
    targetLocationId,
    updatedRemainingCredits: updatedCredits,
    settlementRecord,
  };
}
