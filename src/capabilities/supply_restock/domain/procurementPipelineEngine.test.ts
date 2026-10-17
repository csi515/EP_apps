import assert from 'node:assert/strict';
import {
  createPurchaseRequisition,
  lookupItemProcurementHistory,
  checkInternalInventoryAvailability,
  vetPurchaseRequisition,
  createPurchaseContractPackage,
  issueContractPurchaseOrder,
  syncPurchaseOrderToInventoryReceipt,
  type ItemProcurementHistory,
  type StockInventoryItem,
  type BiddingVendorQuote,
  type SoleSourceDetails,
} from './procurementPipelineEngine';

function run() {
  console.log('[test:procurement-pipeline] running tests...');

  // 과거 구매 이력 샘플
  const mockHistory: ItemProcurementHistory[] = [
    {
      sku: 'BOLT-M8-100',
      itemName: '고장력 육각볼트 M8',
      specification: 'SUS304, 30mm',
      lastVendor: '한국정밀화스너',
      purchaseAccount: 'MRO 도매몰 (법인계정)',
      lastUnitPrice: 450,
      lastPurchasedAt: '2026-09-15',
    },
    {
      sku: 'OIL-VG46-20L',
      itemName: '유압 작동유 VG46',
      specification: '20L 말통',
      lastVendor: '극동루브리컨츠',
      purchaseAccount: '쿠팡 비즈니스',
      lastUnitPrice: 55000,
      lastPurchasedAt: '2026-08-20',
    },
  ];

  // 1. 과거 구매 이력 자동 매핑 (lookupItemProcurementHistory)
  {
    const history1 = lookupItemProcurementHistory('BOLT-M8-100', mockHistory);
    assert.ok(history1);
    assert.equal(history1.lastVendor, '한국정밀화스너');
    assert.equal(history1.lastUnitPrice, 450);

    const history2 = lookupItemProcurementHistory('작동유', mockHistory);
    assert.ok(history2);
    assert.equal(history2.purchaseAccount, '쿠팡 비즈니스');

    assert.equal(lookupItemProcurementHistory('NON-EXISTENT', mockHistory), null);
    assert.equal(lookupItemProcurementHistory('', mockHistory), null);
  }

  // 2. 1단계: 부서별 구매 요청 (PR) & 구매 사유(Justification) 가드
  {
    // 2-1) 구매 사유 누락 또는 5자 미만 시 차단
    const failNoJustification = createPurchaseRequisition({
      department: '생산1팀',
      requesterName: '홍길동',
      targetDeliveryDate: '2026-10-25',
      justification: '',
      items: [
        {
          sku: 'BOLT-M8-100',
          itemName: '고장력 육각볼트 M8',
          quantity: 200,
          unit: 'EA',
          estimatedUnitPrice: 500,
        },
      ],
    });
    assert.equal(failNoJustification.pr, null);
    assert.ok(failNoJustification.error?.includes('구매 사유(Justification)는 5자 이상'));

    const failShortJustification = createPurchaseRequisition({
      department: '생산1팀',
      requesterName: '홍길동',
      targetDeliveryDate: '2026-10-25',
      justification: '필요함', // 3자
      items: [
        {
          sku: 'BOLT-M8-100',
          itemName: '고장력 육각볼트 M8',
          quantity: 200,
          unit: 'EA',
          estimatedUnitPrice: 500,
        },
      ],
    });
    assert.equal(failShortJustification.pr, null);

    // 2-2) 품목 누락 시 차단
    const failNoItems = createPurchaseRequisition({
      department: '생산1팀',
      requesterName: '홍길동',
      targetDeliveryDate: '2026-10-25',
      justification: '3호기 설비 긴급 보수를 위해 즉시 필요합니다.',
      items: [],
    });
    assert.equal(failNoItems.pr, null);
    assert.ok(failNoItems.error?.includes('최소 1개 이상의 구매 요청 품목'));

    // 2-3) 정상 생성 및 과거 구매 이력 자동 매핑
    const prSuccess = createPurchaseRequisition({
      department: '생산1팀',
      requesterName: '홍길동',
      targetDeliveryDate: '2026-10-25',
      justification: '3호 가공설비 정기 유지보수용 소모품 소진에 따른 긴급 보충',
      items: [
        {
          sku: 'BOLT-M8-100',
          itemName: '고장력 육각볼트 M8',
          specification: 'SUS304',
          quantity: 200,
          unit: 'EA',
          estimatedUnitPrice: 500,
        },
      ],
      historyList: mockHistory,
      sequenceNumber: 1,
    });

    assert.ok(prSuccess.pr);
    const pr1 = prSuccess.pr;
    assert.ok(pr1.prNumber.startsWith('PR-'));
    assert.equal(pr1.department, '생산1팀');
    assert.equal(pr1.status, 'submitted');
    assert.equal(pr1.totalEstimatedAmount, 100000); // 200 * 500
    // 과거 이력 자동 매핑 확인
    assert.equal(pr1.items[0].lastVendor, '한국정밀화스너');
    assert.equal(pr1.items[0].purchaseAccount, 'MRO 도매몰 (법인계정)');
    assert.equal(pr1.items[0].lastUnitPrice, 450);
    // 감사 기록(auditTrail) 확인
    assert.equal(pr1.auditTrail.length, 1);
    assert.equal(pr1.auditTrail[0].action, 'SUBMIT_PR');
  }

  // 3. 2단계: 사내 창고 재고 중복 확인 & 구매부서 검수 (Vetting)
  {
    const mockInventoryStock: StockInventoryItem[] = [
      { sku: 'BOLT-M8-100', itemName: '고장력 육각볼트 M8', availableQuantity: 300 }, // 충분 (200 요청 대비)
      { sku: 'OIL-VG46-20L', itemName: '유압 작동유 VG46', availableQuantity: 1 }, // 일부 있음 (3 요청 대비)
      { sku: 'FILTER-AIR-01', itemName: '에어 흡기 필터', availableQuantity: 0 }, // 없음
    ];

    const prSuccess = createPurchaseRequisition({
      department: '생산1팀',
      requesterName: '홍길동',
      targetDeliveryDate: '2026-10-25',
      justification: '설비 가동을 위한 소모품 보충',
      items: [
        {
          sku: 'BOLT-M8-100',
          itemName: '고장력 육각볼트 M8',
          quantity: 200,
          unit: 'EA',
          estimatedUnitPrice: 500,
        },
        {
          sku: 'OIL-VG46-20L',
          itemName: '유압 작동유 VG46',
          quantity: 3,
          unit: 'CAN',
          estimatedUnitPrice: 60000,
        },
        {
          sku: 'FILTER-AIR-01',
          itemName: '에어 흡기 필터',
          quantity: 5,
          unit: 'EA',
          estimatedUnitPrice: 15000,
        },
      ],
      sequenceNumber: 2,
    });
    const pr = prSuccess.pr!;

    // 3-1) 사내 창고 재고 확인
    const stockChecks = checkInternalInventoryAvailability(pr.items, mockInventoryStock);
    assert.equal(stockChecks.length, 3);
    assert.equal(stockChecks[0].hasEnoughStock, true);
    assert.ok(stockChecks[0].message.includes('사내 창고 내 대체/가용 재고 충분'));
    assert.equal(stockChecks[1].hasPartialStock, true);
    assert.ok(stockChecks[1].message.includes('사내 창고 내 일부 재고 있음'));
    assert.equal(stockChecks[2].hasEnoughStock, false);
    assert.equal(stockChecks[2].hasPartialStock, false);

    // 3-2) 구매부서 반려 처리 (사내 대체 재고 활용 가능 사유)
    assert.throws(
      () =>
        vetPurchaseRequisition(pr, 'reject', { name: '이구매', department: '구매자재팀' }, ''),
      /반려 시 구체적인 반려 사유를 반드시 입력/
    );

    const rejectedPr = vetPurchaseRequisition(
      pr,
      'reject',
      { name: '이구매', department: '구매자재팀' },
      '사내 창고에 대체 가용 재고(볼트 300개)가 충분하여 신규 구매 반려함'
    );
    assert.equal(rejectedPr.status, 'rejected');
    assert.equal(rejectedPr.vettedBy, '이구매');
    assert.equal(
      rejectedPr.rejectionReason,
      '사내 창고에 대체 가용 재고(볼트 300개)가 충분하여 신규 구매 반려함'
    );
    assert.equal(rejectedPr.auditTrail.length, 2);
    assert.equal(rejectedPr.auditTrail[1].action, 'REJECT_PR');

    // 3-3) 구매부서 적합 승인 처리
    const approvedPr = vetPurchaseRequisition(
      pr,
      'approve',
      { name: '이구매', department: '구매자재팀' }
    );
    assert.equal(approvedPr.status, 'vetted_approved');
    assert.equal(approvedPr.vettedBy, '이구매');
    assert.equal(approvedPr.auditTrail.length, 2);
    assert.equal(approvedPr.auditTrail[1].action, 'APPROVE_PR');
  }

  // 4. 3단계: 다품목 묶음 패키지 및 계약 방식 결정 (경쟁 입찰 vs 수의 계약)
  {
    // 검수 승인된 PR 준비
    const prA = createPurchaseRequisition({
      department: '생산1팀',
      requesterName: '김생산',
      targetDeliveryDate: '2026-10-30',
      justification: '생산 1라인 소모품 정기 보충',
      items: [
        {
          sku: 'BOLT-M8-100',
          itemName: '고장력 육각볼트 M8',
          quantity: 100,
          unit: 'EA',
          estimatedUnitPrice: 500,
        },
      ],
      sequenceNumber: 10,
    }).pr!;
    const vettedPrA = vetPurchaseRequisition(prA, 'approve', { name: '이구매' });

    const prB = createPurchaseRequisition({
      department: '연구개발팀',
      requesterName: '박연구',
      targetDeliveryDate: '2026-10-31',
      justification: '시제품 전용 특수 유압 작동유 긴급 조달',
      items: [
        {
          sku: 'OIL-VG46-20L',
          itemName: '유압 작동유 VG46',
          quantity: 2,
          unit: 'CAN',
          estimatedUnitPrice: 60000,
        },
      ],
      sequenceNumber: 11,
    }).pr!;
    const vettedPrB = vetPurchaseRequisition(prB, 'approve', { name: '이구매' });

    // 4-1) 옵션 A: 경쟁 입찰 (Bidding)
    // 2곳 미만 견적 시 에러
    const failBidding = createPurchaseContractPackage({
      packageTitle: '2026년 10월 생산 및 연구 자재 일괄 조달',
      sourceRequisitions: [vettedPrA, vettedPrB],
      contractType: 'bidding',
      biddingQuotes: [
        { vendorName: '단독업체', quotedUnitPrice: 500, totalQuotedAmount: 170000, leadTimeDays: 3 },
      ],
    });
    assert.equal(failBidding.package, null);
    assert.ok(failBidding.error?.includes('최소 2곳 이상의 공급사 견적 비교가 필수'));

    // 3곳 견적 입력 시 최저가 추천 및 선정
    const quotes: BiddingVendorQuote[] = [
      { vendorName: '한국공구상사', quotedUnitPrice: 480, totalQuotedAmount: 165000, leadTimeDays: 4 },
      { vendorName: '글로벌MRO', quotedUnitPrice: 450, totalQuotedAmount: 155000, leadTimeDays: 2 }, // 최저가 & 최단납기
      { vendorName: '제일테크', quotedUnitPrice: 520, totalQuotedAmount: 175000, leadTimeDays: 3 },
    ];
    const successBidding = createPurchaseContractPackage({
      packageTitle: '2026년 10월 생산 및 연구 자재 일괄 조달',
      sourceRequisitions: [vettedPrA, vettedPrB],
      contractType: 'bidding',
      biddingQuotes: quotes,
    });

    assert.ok(successBidding.package);
    const biddingPkg = successBidding.package;
    assert.equal(biddingPkg.contractType, 'bidding');
    assert.equal(biddingPkg.items.length, 2);
    assert.equal(biddingPkg.winningVendor, '글로벌MRO'); // 최저가 추천 선정
    assert.ok(biddingPkg.auditEvidence.contractMethodJustification.includes('경쟁 견적 입찰'));

    // 4-2) 옵션 B: 수의 계약 (Sole Source) & 사유서 필수 가드
    // 사유서 누락 시 에러
    const failSoleSourceNoReason = createPurchaseContractPackage({
      packageTitle: '특수 로봇 관절 부품 단독 수의계약',
      sourceRequisitions: [vettedPrA],
      contractType: 'sole_source',
    });
    assert.equal(failSoleSourceNoReason.package, null);

    // 사유가 10자 미만인 경우 에러
    const failSoleSourceShort = createPurchaseContractPackage({
      packageTitle: '특수 로봇 관절 부품 단독 수의계약',
      sourceRequisitions: [vettedPrA],
      contractType: 'sole_source',
      soleSource: {
        reasonType: 'patent_exclusive',
        reasonDetail: '특허제품임', // 5자
        targetVendor: '로보텍코리아',
        agreedAmount: 50000,
      },
    });
    assert.equal(failSoleSourceShort.package, null);
    assert.ok(failSoleSourceShort.error?.includes('수의계약 상세 사유(Justification)는 10자 이상'));

    // 정상 수의계약 패키지 생성
    const soleSourceDetails: SoleSourceDetails = {
      reasonType: 'equipment_compatibility',
      reasonDetail: '기존 독일산 정밀가공기 1호기의 제조사 정품 규격 부품으로 타사 호환품 사용 시 보증 무효화됨',
      supportingDocumentName: '제조사정품인증서_독일바이어.pdf',
      targetVendor: '바이어코리아',
      agreedAmount: 50000,
    };
    const successSoleSource = createPurchaseContractPackage({
      packageTitle: '1호기 정품 부품 단독 수의계약',
      sourceRequisitions: [vettedPrA],
      contractType: 'sole_source',
      soleSource: soleSourceDetails,
    });

    assert.ok(successSoleSource.package);
    const solePkg = successSoleSource.package;
    assert.equal(solePkg.contractType, 'sole_source');
    assert.equal(solePkg.winningVendor, '바이어코리아');
    assert.ok(solePkg.auditEvidence.contractMethodJustification.includes('수의계약 사유서'));
    assert.ok(solePkg.auditEvidence.contractMethodJustification.includes('기존 설비·기계 호환성'));
  }

  // 5. 4단계: 전자결재 승인 및 단일 계약 발주서(PO) 일괄 발행 & 재고 '입고 대기' 연동
  {
    const pr = createPurchaseRequisition({
      department: '설비보전팀',
      requesterName: '최보전',
      targetDeliveryDate: '2026-11-05',
      justification: '압출기 5호기 긴급 오버홀 수리용 실링 키트 조달',
      items: [
        {
          sku: 'SEAL-KIT-500',
          itemName: '압출기 내열 실링 키트',
          specification: 'NBR 200℃ 내열',
          quantity: 10,
          unit: 'SET',
          estimatedUnitPrice: 40000,
        },
      ],
      sequenceNumber: 99,
    }).pr!;
    const vettedPr = vetPurchaseRequisition(pr, 'approve', { name: '이구매' });

    const contractPackage = createPurchaseContractPackage({
      packageTitle: '2026년 동절기 설비 보전 자재 조달',
      sourceRequisitions: [vettedPr],
      contractType: 'sole_source',
      soleSource: {
        reasonType: 'emergency_restoration',
        reasonDetail: '설비 누유 발생에 따른 가동 중단 방지를 위해 제조사 당일 출고 단독 계약 체결',
        supportingDocumentName: '설비비상수리품의서.pdf',
        targetVendor: '동아실링테크',
        agreedAmount: 400000,
      },
    }).package!;

    // 발주서(PO) 일괄 발행
    const po = issueContractPurchaseOrder({
      contractPackage,
      approvers: [
        { name: '이구매', role: '구매팀장' },
        { name: '김대표', role: '대표이사' },
      ],
      deliveryDueDate: '2026-11-08',
      orderSequence: 1,
    });

    assert.ok(po.poNumber.startsWith('PO-'));
    assert.equal(po.vendorName, '동아실링테크');
    assert.equal(po.totalAmount, 400000);
    assert.equal(po.items.length, 1);
    assert.equal(po.items[0].sku, 'SEAL-KIT-500');
    assert.equal(po.items[0].quantity, 10);
    assert.equal(po.approverSignatures.length, 2);
    // 감사 증빙 요약 보존 확인 (ISO 9001 / 내부감사 증빙)
    assert.ok(po.justificationSummary.includes('압출기 5호기 긴급 오버홀'));
    assert.ok(po.contractRationaleSummary.includes('재해·설비 긴급 고장 복구용 긴급 조달'));

    // 5-2) 재고(inventory) '입고 대기(pending_receipt)' 연동 확인
    const inventoryReceipts = syncPurchaseOrderToInventoryReceipt(po);
    assert.equal(inventoryReceipts.length, 1);
    assert.equal(inventoryReceipts[0].sku, 'SEAL-KIT-500');
    assert.equal(inventoryReceipts[0].pendingQuantity, 10);
    assert.equal(inventoryReceipts[0].status, 'pending_receipt');
    assert.equal(inventoryReceipts[0].poNumber, po.poNumber);
  }

  console.log('procurementPipelineEngine.test.ts: all assertions passed!');
}

run();
