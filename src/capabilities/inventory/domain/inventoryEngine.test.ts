import assert from 'node:assert/strict';
import {
  applyStockMovement,
  checkSafetyStockWarning,
  generatePurchaseOrderRecommendations,
  convertPurchaseOrderToApInvoicePayload,
  type InventoryItem,
} from './inventoryEngine';

function run() {
  const item: InventoryItem = {
    id: 'inv-1',
    name: '골프공 세트',
    sku: 'GOLF-BALL-01',
    currentStock: 20,
    safetyStock: 5,
    unitPrice: 15000,
  };

  // 1. 입고
  const inMovement = applyStockMovement(item, {
    itemId: 'inv-1',
    type: 'IN',
    quantity: 10,
    timestamp: '2026-06-01T10:00:00Z',
  });
  assert.equal(inMovement.success, true);
  assert.equal(inMovement.updatedItem.currentStock, 30);

  // 2. 출고
  const outMovement = applyStockMovement(inMovement.updatedItem, {
    itemId: 'inv-1',
    type: 'OUT',
    quantity: 26,
    timestamp: '2026-06-01T11:00:00Z',
  });
  assert.equal(outMovement.success, true);
  assert.equal(outMovement.updatedItem.currentStock, 4);

  // 3. 재고 부족 시 출고 차단
  const overOut = applyStockMovement(outMovement.updatedItem, {
    itemId: 'inv-1',
    type: 'OUT',
    quantity: 10,
    timestamp: '2026-06-01T12:00:00Z',
  });
  assert.equal(overOut.success, false);

  // 4. 안전재고 경고 판정 (현재고 4 <= 안전재고 5)
  const warn = checkSafetyStockWarning(outMovement.updatedItem);
  assert.equal(warn.isLowStock, true);
  assert.equal(warn.shortageQuantity, 1);

  // 5. 실사 조정
  const adjust = applyStockMovement(outMovement.updatedItem, {
    itemId: 'inv-1',
    type: 'ADJUST',
    quantity: 15,
    timestamp: '2026-06-01T13:00:00Z',
  });
  assert.equal(adjust.success, true);
  assert.equal(adjust.updatedItem.currentStock, 15);
  assert.equal(checkSafetyStockWarning(adjust.updatedItem).isLowStock, false);

  // 6. 안전재고 미달 품목 기반 자동 발주서(Auto-PO) 권고 생성
  const inventoryList: InventoryItem[] = [
    {
      id: 'bean-1',
      name: '원두 1kg',
      sku: 'BEAN-01',
      currentStock: 2,
      safetyStock: 10,
      unitPrice: 25000,
      vendorId: 'vend-1',
      vendorName: '(주)대한원두',
      minOrderQuantity: 10, // MOQ 10
      packUnit: 5, // 5개 단위 포장
    },
    {
      id: 'milk-1',
      name: '우유 1L',
      sku: 'MILK-01',
      currentStock: 3,
      safetyStock: 15,
      unitPrice: 2600,
      vendorId: 'vend-1',
      vendorName: '(주)대한원두',
      minOrderQuantity: 10,
      packUnit: 6, // 1박스 6개 단위
    },
    {
      id: 'cup-1',
      name: '종이컵 1000개입',
      sku: 'CUP-01',
      currentStock: 20, // 정상 재고 (발주 대상 아님)
      safetyStock: 5,
      unitPrice: 30000,
      vendorId: 'vend-2',
      vendorName: '삼양패키징',
    },
  ];

  const poList = generatePurchaseOrderRecommendations(inventoryList, '2026-10-15');
  assert.equal(poList.length, 1, '부족 품목이 있는 vend-1에 대한 발주서 1건만 생성되어야 합니다.');

  const po = poList[0];
  assert.equal(po.vendorId, 'vend-1');
  assert.equal(po.items.length, 2);

  // 원두: 부족 8개, MOQ 10개, 5개 단위 배수 -> 10개 발주
  const beanPoItem = po.items.find((it) => it.sku === 'BEAN-01')!;
  assert.equal(beanPoItem.recommendedOrderQuantity, 10);
  assert.equal(beanPoItem.estimatedSupplyAmount, 250000);

  // 우유: 부족 12개, 6개 배수 -> 12개 발주
  const milkPoItem = po.items.find((it) => it.sku === 'MILK-01')!;
  assert.equal(milkPoItem.recommendedOrderQuantity, 12);
  assert.equal(milkPoItem.estimatedSupplyAmount, 31200);

  // 7. 발주서(PO)를 매입 전표(AP Invoice) 페이로드로 변환
  const apInvoice = convertPurchaseOrderToApInvoicePayload(po, '2026-10-15', 30);
  assert.equal(apInvoice.vendorId, 'vend-1');
  assert.equal(apInvoice.totalSupplyAmount, 281200);
  assert.equal(apInvoice.totalTaxAmount, 28120);
  assert.equal(apInvoice.totalAmount, 309320);
  assert.equal(apInvoice.dueDate, '2026-11-14');

  console.log('inventoryEngine.test.ts: ok (with Auto-PO & AP Invoice conversion)');
}

run();
