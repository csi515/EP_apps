/**
 * 재고·자재 입출고, 안전재고 관리 및 자동 발주(Auto-PO) 엔진 (Pure Function Domain)
 */

export type StockMovementType = 'IN' | 'OUT' | 'ADJUST' | 'DISCARD';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  barcode?: string; // 바코드 (EAN-13, Code-128 등)
  qrCodeUrl?: string; // 모바일 스캔용 QR 딥링크 또는 URL
  currentStock: number;
  safetyStock: number;
  unitPrice: number;
  vendorId?: string; // 거래처(공급처) ID
  vendorName?: string; // 거래처 상호 (e.g. "(주)대한식자재", "밀본 코리아")
  minOrderQuantity?: number; // 최소 발주 수량 (MOQ, 예: 10개)
  packUnit?: number; // 번들/박스 포장 단위 (예: 1박스 = 6개)
}

export interface BundleComponent {
  itemId: string;
  componentSku: string;
  componentName: string;
  quantityPerBundle: number; // 세트 1개당 구성 수량
}

export interface BundleProduct {
  id: string;
  bundleSku: string;
  name: string; // e.g. "화원 초보자 가드닝 세트 (화분+식물+받침대)"
  barcode?: string;
  sellingPrice: number;
  components: BundleComponent[];
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

export interface BundleDeductionResult {
  updatedInventory: InventoryItem[];
  success: boolean;
  shortages?: Array<{
    itemId: string;
    name: string;
    required: number;
    currentStock: number;
  }>;
  movements?: StockMovement[];
  error?: string;
}

/**
 * 조합형/옵션 SKU 번들 세트 판매 시 구성 품목 원자적 동시 차감 (BOM/Bundle Pure Domain)
 */
export function deductBundleStock(params: {
  bundle: BundleProduct;
  sellQuantity: number;
  currentInventory: readonly InventoryItem[];
  timestamp?: string;
  reason?: string;
}): BundleDeductionResult {
  const {
    bundle,
    sellQuantity,
    currentInventory,
    timestamp = new Date().toISOString(),
    reason = `번들 판매 차감: ${bundle.name} (${sellQuantity}세트)`,
  } = params;

  if (sellQuantity <= 0) {
    return {
      updatedInventory: [...currentInventory],
      success: false,
      error: '판매 수량은 0보다 커야 합니다.',
    };
  }

  const shortages: NonNullable<BundleDeductionResult['shortages']> = [];

  // 1. 사전 원자적 재고 충족 여부 전수 검증
  for (const comp of bundle.components) {
    const item = currentInventory.find((it) => it.id === comp.itemId);
    const requiredQty = comp.quantityPerBundle * sellQuantity;

    if (!item || item.currentStock < requiredQty) {
      shortages.push({
        itemId: comp.itemId,
        name: comp.componentName,
        required: requiredQty,
        currentStock: item ? item.currentStock : 0,
      });
    }
  }

  // 부족 품목이 하나라도 있으면 전체 차감 롤백/중단
  if (shortages.length > 0) {
    return {
      updatedInventory: [...currentInventory],
      success: false,
      shortages,
      error: `번들 구성 부품 중 재고가 부족한 품목이 있습니다.`,
    };
  }

  // 2. 모든 구성 품목 재고 차감 및 출고 수불부 레코드 생성
  const movements: StockMovement[] = [];
  const updatedInventory = currentInventory.map((item) => {
    const comp = bundle.components.find((c) => c.itemId === item.id);
    if (!comp) return item;

    const deductQty = comp.quantityPerBundle * sellQuantity;
    movements.push({
      itemId: item.id,
      type: 'OUT',
      quantity: deductQty,
      reason,
      timestamp,
    });

    return {
      ...item,
      currentStock: item.currentStock - deductQty,
    };
  });

  return {
    updatedInventory,
    success: true,
    movements,
  };
}

/**
 * 모바일 카메라/바코드 리더기 스캔 파싱 및 아이템 매칭
 */
export function scanBarcodeAndFindItem(params: {
  barcodeRaw: string;
  items: readonly InventoryItem[];
  bundles?: readonly BundleProduct[];
}): {
  foundType?: 'single' | 'bundle';
  item?: InventoryItem;
  bundle?: BundleProduct;
  success: boolean;
} {
  const cleanCode = params.barcodeRaw.trim().replace(/[\r\n]/g, '');
  if (!cleanCode) {
    return { success: false };
  }

  // 1. 단품 바코드 또는 SKU 일치 검색
  const matchedItem = params.items.find(
    (it) => it.barcode === cleanCode || it.sku.toLowerCase() === cleanCode.toLowerCase()
  );
  if (matchedItem) {
    return {
      success: true,
      foundType: 'single',
      item: matchedItem,
    };
  }

  // 2. 번들 바코드 또는 번들 SKU 검색
  if (params.bundles) {
    const matchedBundle = params.bundles.find(
      (b) => b.barcode === cleanCode || b.bundleSku.toLowerCase() === cleanCode.toLowerCase()
    );
    if (matchedBundle) {
      return {
        success: true,
        foundType: 'bundle',
        bundle: matchedBundle,
      };
    }
  }

  return { success: false };
}

/**
 * EAN-13 표준 체크섬 계산 함수 (12자리 숫자 입력 -> 1자리 체크섬 0~9 반환)
 * 규칙: 홀수번째 자릿수(1, 3, 5, 7, 9, 11) 가중치 1, 짝수번째 자릿수(2, 4, 6, 8, 10, 12) 가중치 3
 */
export function calculateEan13CheckDigit(twelveDigits: string): number {
  if (!/^\d{12}$/.test(twelveDigits)) {
    throw new Error('EAN-13 체크섬 계산을 위해서는 정확히 12자리 숫자가 필요합니다.');
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(twelveDigits[i], 10);
    sum += i % 2 === 0 ? digit * 1 : digit * 3;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * 13자리 EAN-13 바코드 유효성 검증
 */
export function isValidEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  const base12 = code.slice(0, 12);
  const checkDigit = parseInt(code.slice(12), 10);
  return calculateEan13CheckDigit(base12) === checkDigit;
}

/**
 * 사업장 고유 식별 바코드 자동 채번 함수
 * 한국 국가코드 880 + 4자리 사업장코드 + 5자리 품목순번 + 1자리 체크섬 = 총 13자리 EAN-13
 */
export function generateItemBarcode(organizationPublicCode: string, itemSequence: number): string {
  let orgNumStr = organizationPublicCode.replace(/\D/g, '');
  if (orgNumStr.length < 4) {
    let hash = 0;
    for (let i = 0; i < organizationPublicCode.length; i++) {
      hash = (hash * 31 + organizationPublicCode.charCodeAt(i)) % 10000;
    }
    orgNumStr = (hash < 1000 ? hash + 1000 : hash).toString().padStart(4, '0');
  } else {
    orgNumStr = orgNumStr.slice(0, 4).padStart(4, '0');
  }

  const seqStr = Math.max(1, itemSequence).toString().padStart(5, '0').slice(-5);
  const base12 = `880${orgNumStr}${seqStr}`;
  const checkDigit = calculateEan13CheckDigit(base12);
  return `${base12}${checkDigit}`;
}

/**
 * 라벨 인쇄 규격 모델
 */
export type LabelSheetLayoutType =
  | 'A4_24_FORMTEC' // A4 24칸 (3열 x 8행, 70mm x 35mm)
  | 'A4_16_FORMTEC' // A4 16칸 (2열 x 8행, 99.1mm x 34mm)
  | 'THERMAL_50_30'; // 감열 라벨프린터 롤지 (50mm x 30mm)

export interface LabelSheetGridConfig {
  layout: LabelSheetLayoutType;
  title: string;
  labelsPerPage: number;
  columns: number;
  rows: number;
  labelWidthMm: number;
  labelHeightMm: number;
  isContinuousRoll?: boolean;
}

export const LABEL_LAYOUT_CONFIGS: Record<LabelSheetLayoutType, LabelSheetGridConfig> = {
  A4_24_FORMTEC: {
    layout: 'A4_24_FORMTEC',
    title: 'A4 라벨지 24칸 (3x8 폼텍 3107/3108 규격)',
    labelsPerPage: 24,
    columns: 3,
    rows: 8,
    labelWidthMm: 70,
    labelHeightMm: 35,
    isContinuousRoll: false,
  },
  A4_16_FORMTEC: {
    layout: 'A4_16_FORMTEC',
    title: 'A4 라벨지 16칸 (2x8 폼텍 3105 규격)',
    labelsPerPage: 16,
    columns: 2,
    rows: 8,
    labelWidthMm: 99.1,
    labelHeightMm: 34,
    isContinuousRoll: false,
  },
  THERMAL_50_30: {
    layout: 'THERMAL_50_30',
    title: '감열 라벨프린터 (50mm x 30mm 단독 출력)',
    labelsPerPage: 1,
    columns: 1,
    rows: 1,
    labelWidthMm: 50,
    labelHeightMm: 30,
    isContinuousRoll: true,
  },
};

export interface PrintableBarcodeLabel {
  itemId: string;
  itemName: string;
  sku: string;
  barcode: string;
  qrCodeValue: string;
  unitPrice?: number;
  vendorName?: string;
  printSequence: number;
}

export function generatePrintLabelItems(params: {
  item: InventoryItem;
  quantity: number;
  customPrice?: number;
  baseUrl?: string;
}): PrintableBarcodeLabel[] {
  const { item, quantity, customPrice, baseUrl = 'https://moa.app/i' } = params;
  const count = Math.max(1, Math.min(quantity, 500)); // 최대 500장 안전 한도
  const effectiveBarcode = item.barcode || item.sku;
  const effectiveQr = item.qrCodeUrl || `${baseUrl}/${encodeURIComponent(effectiveBarcode)}`;
  const effectivePrice = customPrice !== undefined ? customPrice : item.unitPrice;

  const result: PrintableBarcodeLabel[] = [];
  for (let i = 1; i <= count; i++) {
    result.push({
      itemId: item.id,
      itemName: item.name,
      sku: item.sku,
      barcode: effectiveBarcode,
      qrCodeValue: effectiveQr,
      unitPrice: effectivePrice,
      vendorName: item.vendorName,
      printSequence: i,
    });
  }
  return result;
}

export function formatLabelSheetPages(
  labels: PrintableBarcodeLabel[],
  layout: LabelSheetLayoutType
): PrintableBarcodeLabel[][] {
  const config = LABEL_LAYOUT_CONFIGS[layout];
  const perPage = config.labelsPerPage;
  const pages: PrintableBarcodeLabel[][] = [];

  for (let i = 0; i < labels.length; i += perPage) {
    pages.push(labels.slice(i, i + perPage));
  }

  return pages;
}


