/**
 * W1 필수축 도메인 수명주기 스모크 (DB 불필요, CI always).
 * 결재 다단승인·반려 / 재고 FEFO·음수차단 / 발주 조립 / 제보 상태전이
 */
import assert from 'node:assert/strict';
import {
  transitionApprovalStep,
  validateApprovalSteps,
  type ApprovalRequest,
} from '@/capabilities/approval_workflow/domain/approvalEngine';
import {
  allocateStockLotsFefo,
  applyStockMovement,
  type InventoryItem,
  type StockLotItem,
} from '@/capabilities/inventory/domain/inventoryEngine';
import {
  assemblePurchaseOrder,
  detectRestockNeeded,
  evaluateRestockRecommendation,
  validateRestockQuantities,
  type RestockItem,
} from '@/capabilities/supply_restock/domain/supplyRestockEngine';
import {
  createPurchaseRequisition,
  transitionPurchaseRequisitionStatus,
  vetPurchaseRequisition,
} from '@/capabilities/supply_restock/domain/procurementPipelineEngine';
import {
  sanitizeGrievanceSubmission,
  transitionGrievanceStatus,
  validateGrievanceSubmission,
  type AnonymousGrievanceRecord,
} from '@/capabilities/whistleblower_grievance/domain/grievanceEngine';

console.log('=== W1 required ops lifecycle (domain) ===');

// --- 결재: 2단 승인 ---
{
  const stepsOk = validateApprovalSteps('requester', [
    { stepOrder: 1, stepType: 'review', approverId: 'lead', approverName: '팀장' },
    { stepOrder: 2, stepType: 'approval', approverId: 'boss', approverName: '부장' },
  ]);
  assert.equal(stepsOk.valid, true);

  let req: ApprovalRequest = {
    id: 'req-w1',
    organizationId: 'org',
    title: 'w1 smoke',
    content: {},
    requesterId: 'requester',
    requesterName: '기안',
    status: 'pending',
    currentStepOrder: 1,
    totalSteps: 2,
    steps: [
      {
        id: 's1',
        requestId: 'req-w1',
        stepOrder: 1,
        stepType: 'review',
        approverId: 'lead',
        approverName: '팀장',
        status: 'pending',
      },
      {
        id: 's2',
        requestId: 'req-w1',
        stepOrder: 2,
        stepType: 'approval',
        approverId: 'boss',
        approverName: '부장',
        status: 'waiting',
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const step1 = transitionApprovalStep(req, 's1', 'approve', '검토 OK');
  assert.equal(step1.success, true);
  assert.equal(step1.isFinalApproval, false);
  req = step1.updatedRequest!;
  assert.equal(req.currentStepOrder, 2);
  assert.equal(req.steps[1].status, 'pending');

  const step2 = transitionApprovalStep(req, 's2', 'approve', '최종 OK');
  assert.equal(step2.success, true);
  assert.equal(step2.isFinalApproval, true);
  assert.equal(step2.updatedRequest?.status, 'approved');
  console.log('  approval multi-step approve ok');
}

// --- 결재: 반려 후 draft ---
{
  const req: ApprovalRequest = {
    id: 'req-rej',
    organizationId: 'org',
    title: 'w1 reject',
    content: {},
    requesterId: 'requester',
    requesterName: '기안',
    status: 'pending',
    currentStepOrder: 1,
    totalSteps: 1,
    steps: [
      {
        id: 's1',
        requestId: 'req-rej',
        stepOrder: 1,
        stepType: 'approval',
        approverId: 'boss',
        approverName: '부장',
        status: 'pending',
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const noReason = transitionApprovalStep(req, 's1', 'reject', '  ');
  assert.equal(noReason.success, false);
  const rejected = transitionApprovalStep(req, 's1', 'reject', '예산 초과');
  assert.equal(rejected.success, true);
  assert.equal(rejected.updatedRequest?.status, 'draft');
  assert.equal(rejected.updatedRequest?.rejectionReason, '예산 초과');
  console.log('  approval reject → draft ok');
}

// --- 재고: 출고 음수 차단 + FEFO ---
{
  const item: InventoryItem = {
    id: 'i1',
    name: '장갑',
    sku: 'SKU-1',
    currentStock: 5,
    safetyStock: 2,
    unitPrice: 1000,
  };
  const bad = applyStockMovement(item, {
    itemId: 'i1',
    type: 'OUT',
    quantity: 9,
    timestamp: '2026-01-01T00:00:00.000Z',
  });
  assert.equal(bad.success, false);

  const ok = applyStockMovement(item, {
    itemId: 'i1',
    type: 'OUT',
    quantity: 3,
    timestamp: '2026-01-01T00:00:00.000Z',
  });
  assert.equal(ok.success, true);
  assert.equal(ok.updatedItem.currentStock, 2);

  const lots: StockLotItem[] = [
    { id: 'lot-2', itemId: 'i1', lotNumber: 'L-LATE', expiryDate: '2026-12-31', quantity: 10 },
    { id: 'lot-1', itemId: 'i1', lotNumber: 'L-EARLY', expiryDate: '2026-03-01', quantity: 4 },
  ];
  const fefo = allocateStockLotsFefo(lots, 5);
  assert.equal(fefo.isFullyAllocated, true);
  assert.equal(fefo.allocatedLots[0]?.lotNumber, 'L-EARLY');
  assert.equal(fefo.allocatedLots[0]?.allocatedQuantity, 4);
  assert.equal(fefo.allocatedLots[1]?.lotNumber, 'L-LATE');
  assert.equal(fefo.allocatedLots[1]?.allocatedQuantity, 1);
  console.log('  inventory OUT gate + FEFO ok');
}

// --- 발주: 안전재고 감지 → PO ---
{
  const items: RestockItem[] = [
    {
      id: 'r1',
      itemName: 'A4',
      category: 'office',
      currentQuantity: 1,
      safetyThreshold: 5,
      optimalOrderQuantity: 20,
      unit: 'box',
      unitCost: 3000,
      vendorName: '문구사',
    },
    {
      id: 'r2',
      itemName: '토너',
      category: 'office',
      currentQuantity: 10,
      safetyThreshold: 2,
      optimalOrderQuantity: 2,
      unit: 'ea',
      unitCost: 50000,
      vendorName: '문구사',
    },
  ];
  const needed = detectRestockNeeded(items);
  assert.equal(needed.length, 1);
  assert.equal(needed[0].id, 'r1');
  const po = assemblePurchaseOrder('문구사', needed, 'EP', 1);
  assert.match(po.poNumber, /^PO-/);
  assert.equal(po.totalAmount, 60000);
  assert.ok(po.orderSummaryText.includes('A4'));

  const rec = evaluateRestockRecommendation(items[0]);
  assert.equal(rec.isPurchaseRequisitionEligible, true);

  assert.equal(
    validateRestockQuantities({
      currentQuantity: 1,
      safetyThreshold: 5,
      optimalOrderQuantity: 0,
      unitCost: 1,
    }).valid,
    false
  );

  const prRes = createPurchaseRequisition({
    department: '총무',
    requesterName: '담당',
    targetDeliveryDate: '2026-06-01',
    justification: '안전재고 미달 품목 정기 보충',
    items: [
      {
        sku: 'A4',
        itemName: 'A4',
        quantity: 20,
        unit: 'box',
        estimatedUnitPrice: 3000,
      },
    ],
    sequenceNumber: 1,
  });
  assert.ok(prRes.pr);
  const vetted = vetPurchaseRequisition(prRes.pr!, 'approve', { name: '구매' });
  const packaged = transitionPurchaseRequisitionStatus(vetted, 'contract_packaged');
  assert.equal(packaged.ok, true);
  console.log('  supply restock PO assemble ok');
}

// --- 제보: 익명 sanitize + 상태 전이 ---
{
  const valid = validateGrievanceSubmission(
    '야간 근무 수당',
    '지난달 주말 근무 수당이 누락되었습니다.',
    '9876',
    'anonymous'
  );
  assert.equal(valid.isValid, true);

  const sanitized = sanitizeGrievanceSubmission({
    visibility: 'anonymous' as const,
    author_user_id: 'should-null',
  });
  assert.equal(sanitized.author_user_id, null);

  let record: AnonymousGrievanceRecord = {
    id: 'g1',
    ticket_code: 'G-0001',
    category: 'GENERAL_GRIEVANCE',
    subject_title: '야간 근무 수당',
    incident_content: '지난달 주말 근무 수당이 누락되었습니다.',
    evidence_attached: false,
    status: 'SUBMITTED',
    submitted_at: '2026-01-01T00:00:00.000Z',
    visibility: 'anonymous',
    author_user_id: null,
  };

  const badJump = transitionGrievanceStatus(record, 'RESOLVED', 'done');
  assert.equal(badJump.ok, false);

  const investigating = transitionGrievanceStatus(record, 'UNDER_INVESTIGATION');
  assert.equal(investigating.ok, true);
  record = investigating.record;

  const noFeedback = transitionGrievanceStatus(record, 'RESOLVED', '  ');
  assert.equal(noFeedback.ok, false);

  const resolved = transitionGrievanceStatus(record, 'RESOLVED', '수당 정산 완료');
  assert.equal(resolved.ok, true);
  assert.equal(resolved.record.status, 'RESOLVED');
  assert.ok(resolved.record.resolved_at);
  console.log('  grievance sanitize + status lifecycle ok');

  const dismissFromSubmit = transitionGrievanceStatus(
    {
      ...record,
      id: 'g-dismiss',
      status: 'SUBMITTED',
      resolved_at: undefined,
    },
    'DISMISSED',
    '사실관계 확인 불가'
  );
  assert.equal(dismissFromSubmit.ok, true);
  assert.equal(dismissFromSubmit.record.status, 'DISMISSED');
  console.log('  grievance dismiss from submitted ok');
}

console.log('requiredOpsLifecycle.smoke.test.ts: ok');
