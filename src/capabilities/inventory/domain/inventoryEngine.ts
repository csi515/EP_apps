/**
 * 재고·자재 입출고, 안전재고 관리 및 자동 발주(Auto-PO) 엔진 (Pure Function Domain)
 */

export type StockMovementType = 'IN' | 'OUT' | 'ADJUST' | 'DISCARD';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  safetyStock: number;
  unitPrice: number;
  vendorId?: string; // 거래처(공급처) ID
  vendorName?: string; // 거래처 상호 (e.g. "(주)대한식자재", "밀본 코리아")
  minOrderQuantity?: number; // 최소 발주 수량 (MOQ, 예: 10개)
  packUnit?: number; // 번들/박스 포장 단위 (예: 1박스 = 6개)
}

export interface StockMovement {
  itemId: string;
  type: StockMovementType;
  quantity: number;
  reason?: string;
  timestamp: string;
}

export interface PurchaseOrderItemDraft {
  itemId: string;
  sku: string;
  name: string;
  currentStock: number;
  safetyStock: number;
  shortageQuantity: number;
  recommendedOrderQuantity: number;
  unitPrice: number;
  estimatedSupplyAmount: number;
}

export interface PurchaseOrderDraft {
  orderNumber: string;
  vendorId: string;
  vendorName: string;
  orderDate: string; // YYYY-MM-DD
  items: PurchaseOrderItemDraft[];
  totalOrderQuantity: number;
  totalEstimatedAmount: number;
  status: 'draft' | 'approved' | 'sent' | 'converted_to_invoice';
}

export function applyStockMovement(
  item: InventoryItem,
  movement: StockMovement
): { updatedItem: InventoryItem; success: boolean; error?: string } {
  if (movement.quantity <= 0) {
    return {
      updatedItem: item,
      success: false,
      error: '수량은 0보다 커야 합니다.',
    };
  }

  let nextStock = item.currentStock;

  switch (movement.type) {
    case 'IN':
      nextStock += movement.quantity;
      break;
    case 'OUT':
    case 'DISCARD':
      if (item.currentStock < movement.quantity) {
        return {
          updatedItem: item,
          success: false,
          error: `재고가 부족합니다 (현재고: ${item.currentStock}, 요청: ${movement.quantity})`,
        };
      }
      nextStock -= movement.quantity;
      break;
    case 'ADJUST':
      nextStock = movement.quantity;
      break;
  }

  return {
    updatedItem: {
      ...item,
      currentStock: nextStock,
    },
    success: true,
  };
}

export function checkSafetyStockWarning(item: InventoryItem): {
  isLowStock: boolean;
  shortageQuantity: number;
} {
  const isLowStock = item.currentStock <= item.safetyStock;
  const shortageQuantity = isLowStock
    ? Math.max(0, item.safetyStock - item.currentStock)
    : 0;

  return {
    isLowStock,
    shortageQuantity,
  };
}

/**
 * 안전재고 이하로 떨어진 품목들을 분석하여 공급처(Vendor)별 권고 발주서(Auto-PO)를 생성합니다.
 * 최소 발주 수량(MOQ) 및 박스 포장 단위를 올림 계산하여 최적 발주량을 산출합니다.
 */
export function generatePurchaseOrderRecommendations(
  items: InventoryItem[],
  asOfDate: string = new Date().toISOString().split('T')[0]
): PurchaseOrderDraft[] {
  const lowStockItems = items.filter((item) => item.currentStock <= item.safetyStock);
  if (lowStockItems.length === 0) return [];

  // 공급처(vendorId)별 그룹화
  const vendorGroups: Record<string, { vendorName: string; items: PurchaseOrderItemDraft[] }> = {};

  for (const item of lowStockItems) {
    const rawShortage = Math.max(1, item.safetyStock - item.currentStock);
    const moq = item.minOrderQuantity || 1;
    const pack = item.packUnit || 1;

    // 1차: 최소 발주 단위(MOQ) 충족
    let orderQty = Math.max(rawShortage, moq);

    // 2차: 박스 포장 단위가 있을 경우 올림 배수 적용
    if (pack > 1 && orderQty % pack !== 0) {
      orderQty = Math.ceil(orderQty / pack) * pack;
    }

    const estimatedSupply = orderQty * item.unitPrice;
    const vendorId = item.vendorId || 'unassigned_vendor';
    const vendorName = item.vendorName || '기타 일반 거래처';

    if (!vendorGroups[vendorId]) {
      vendorGroups[vendorId] = {
        vendorName,
        items: [],
      };
    }

    vendorGroups[vendorId].items.push({
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      currentStock: item.currentStock,
      safetyStock: item.safetyStock,
      shortageQuantity: rawShortage,
      recommendedOrderQuantity: orderQty,
      unitPrice: item.unitPrice,
      estimatedSupplyAmount: estimatedSupply,
    });
  }

  // 발주서 목록 생성
  const poDrafts: PurchaseOrderDraft[] = Object.entries(vendorGroups).map(([vId, group], index) => {
    const totalQty = group.items.reduce((sum, it) => sum + it.recommendedOrderQuantity, 0);
    const totalAmount = group.items.reduce((sum, it) => sum + it.estimatedSupplyAmount, 0);

    return {
      orderNumber: `PO-${asOfDate.replace(/-/g, '')}-${String(index + 1).padStart(3, '0')}`,
      vendorId: vId,
      vendorName: group.vendorName,
      orderDate: asOfDate,
      items: group.items,
      totalOrderQuantity: totalQty,
      totalEstimatedAmount: totalAmount,
      status: 'draft',
    };
  });

  return poDrafts;
}

/**
 * 생성된 발주서(PO Draft)를 승인 후 `vendor_ap_invoice` 매입 전표(AP Invoice) 생성 페이로드로 변환합니다.
 */
export function convertPurchaseOrderToApInvoicePayload(
  po: PurchaseOrderDraft,
  invoiceDate: string = new Date().toISOString().split('T')[0],
  dueDays: number = 30
): {
  vendorId: string;
  vendorName: string;
  invoiceDate: string;
  dueDate: string;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    supplyAmount: number;
    taxAmount: number;
  }>;
  totalSupplyAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
} {
  const due = new Date(new Date(invoiceDate).getTime() + dueDays * 24 * 3600 * 1000)
    .toISOString()
    .split('T')[0];

  let totalSupply = 0;
  let totalTax = 0;

  const invoiceItems = po.items.map((it) => {
    const supply = it.recommendedOrderQuantity * it.unitPrice;
    const tax = Math.round(supply * 0.1);
    totalSupply += supply;
    totalTax += tax;

    return {
      sku: it.sku,
      name: it.name,
      quantity: it.recommendedOrderQuantity,
      unitPrice: it.unitPrice,
      supplyAmount: supply,
      taxAmount: tax,
    };
  });

  return {
    vendorId: po.vendorId,
    vendorName: po.vendorName,
    invoiceDate,
    dueDate: due,
    items: invoiceItems,
    totalSupplyAmount: totalSupply,
    totalTaxAmount: totalTax,
    totalAmount: totalSupply + totalTax,
  };
}
