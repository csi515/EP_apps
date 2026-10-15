import assert from 'node:assert/strict';
import {
  aggregateHqBranchKpis,
  createInterBranchTransferOrder,
  confirmInterBranchTransferReceipt,
  verifyAndProcessCrossBranchPassCheckIn,
  type LocationKpiInput,
  type MemberPassScope,
} from './branchConsolidationEngine';

console.log('--- Testing branchConsolidationEngine ---');

// Test 1: 본사 전 지점 KPI 집계 및 랭킹 산출
{
  const branches: LocationKpiInput[] = [
    {
      locationId: 'loc-gangnam',
      locationName: '강남본점',
      grossSales: 50000000,
      activeMembersCount: 250,
      transactionsCount: 500,
      capacitySlots: 1000,
      occupiedSlots: 850, // 85%
    },
    {
      locationId: 'loc-hongdae',
      locationName: '홍대직영점',
      grossSales: 35000000,
      activeMembersCount: 180,
      transactionsCount: 350,
      capacitySlots: 800,
      occupiedSlots: 600, // 75%
    },
    {
      locationId: 'loc-pangyo',
      locationName: '판교점',
      grossSales: 40000000,
      activeMembersCount: 200,
      transactionsCount: 400,
      capacitySlots: 800,
      occupiedSlots: 640, // 80%
    },
  ];

  const summary = aggregateHqBranchKpis(branches);
  assert.equal(summary.totalLocationsCount, 3);
  assert.equal(summary.totalGrossSales, 125000000);
  assert.equal(summary.totalActiveMembers, 630);
  assert.equal(summary.topPerformingLocationId, 'loc-gangnam');

  // 매출 랭킹: 1위 강남(5000만), 2위 판교(4000만), 3위 홍대(3500만)
  assert.equal(summary.branches[0].locationId, 'loc-gangnam');
  assert.equal(summary.branches[0].salesRank, 1);
  assert.equal(summary.branches[0].averageTicketPrice, 100000);
  assert.equal(summary.branches[0].salesSharePercent, 40.0); // 5000 / 12500 = 40%

  assert.equal(summary.branches[1].locationId, 'loc-pangyo');
  assert.equal(summary.branches[1].salesRank, 2);

  assert.equal(summary.branches[2].locationId, 'loc-hongdae');
  assert.equal(summary.branches[2].salesRank, 3);

  console.log('✅ Test 1 passed: HQ branch KPI aggregation, ranking, and share percentage');
}

// Test 2: 지점 간 재고 수평 이동 전표 생성 및 수령
{
  const order = createInterBranchTransferOrder({
    fromLocationId: 'loc-gangnam',
    fromLocationName: '강남본점',
    toLocationId: 'loc-hongdae',
    toLocationName: '홍대직영점',
    requestDate: '2026-10-15',
    items: [
      { sku: 'BEAN-01', itemName: '원두 1kg', quantity: 10, unitCost: 20000 },
      { sku: 'SYRUP-01', itemName: '바닐라 시럽 1L', quantity: 5, unitCost: 15000 },
    ],
  });

  assert.equal(order.status, 'in_transit');
  assert.equal(order.totalQuantity, 15);
  assert.equal(order.totalTransferCost, 275000); // 200,000 + 75,000

  // 홍대점에서 수령 확정
  const received = confirmInterBranchTransferReceipt(order, '2026-10-16');
  assert.equal(received.status, 'received');
  assert.equal(received.receivedDate, '2026-10-16');

  console.log('✅ Test 2 passed: Inter-branch stock transfer creation and receipt confirmation');
}

// Test 3: 멀티 지점 회원권 교차 이용 승인 및 지점 간 정산 분개
{
  const allBranchesPass: MemberPassScope = {
    passId: 'PASS-100',
    memberId: 'MEM-01',
    memberName: '이회원',
    homeLocationId: 'loc-gangnam',
    homeLocationName: '강남본점',
    passType: 'all_branches',
    remainingCredits: 10,
    validUntil: '2026-12-31',
    interBranchSplitRatio: {
      homeSharePercent: 30, // 홈 지점 30%
      visitingSharePercent: 70, // 방문 지점 70%
    },
  };

  // 홍대점에서 교차 이용 태그 (1회 30,000원 가치)
  const crossCheckIn = verifyAndProcessCrossBranchPassCheckIn({
    pass: allBranchesPass,
    targetLocationId: 'loc-hongdae',
    sessionEstimatedValue: 30000,
    asOfDate: '2026-10-15',
  });

  assert.equal(crossCheckIn.isAuthorized, true);
  assert.equal(crossCheckIn.updatedRemainingCredits, 9);
  assert.ok(crossCheckIn.settlementRecord);
  assert.equal(crossCheckIn.settlementRecord?.homeLocationId, 'loc-gangnam');
  assert.equal(crossCheckIn.settlementRecord?.visitingLocationId, 'loc-hongdae');
  assert.equal(crossCheckIn.settlementRecord?.homeShareAmount, 9000); // 30% = 9,000원
  assert.equal(crossCheckIn.settlementRecord?.visitingShareAmount, 21000); // 70% = 21,000원

  // 단일 지점 전용 회원권이 타 지점 방문 시 차단
  const singleBranchPass: MemberPassScope = {
    ...allBranchesPass,
    passType: 'single_location',
  };

  const blockCheckIn = verifyAndProcessCrossBranchPassCheckIn({
    pass: singleBranchPass,
    targetLocationId: 'loc-hongdae',
    asOfDate: '2026-10-15',
  });

  assert.equal(blockCheckIn.isAuthorized, false);
  assert.equal(blockCheckIn.updatedRemainingCredits, 10);
  assert.ok(blockCheckIn.failureReason?.includes('등록 지점(강남본점) 전용'));

  console.log('✅ Test 3 passed: Cross-branch pass authorization and inter-branch settlement record');
}

console.log('🎉 All branchConsolidationEngine tests passed successfully!');
