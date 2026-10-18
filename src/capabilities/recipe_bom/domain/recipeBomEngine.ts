/**
 * 식자재 레시피 & 자동 소모 BOM(Bill of Materials) 원가 관리 도메인 엔진 (Pure Functions)
 *
 * 적용 업종: 카페(cafe), 일반음식점(restaurant), 만화/스터디카페 푸드존
 *
 * 주요 기능:
 *  1. 메뉴별 투입 식자재(원두, 우유, 시럽 등) 비례 배합비(BOM) 설정
 *  2. 메뉴 1개 판매 시 원자재 총 원가 및 마진율(%), 원가율(%) 산출
 *  3. 복수 주문 발생 시 식자재별 총 자동 소모 차감 수량(BOM Explosion) 계산
 */

export interface RecipeIngredient {
  inventoryItemId: string; // 연결된 재고 품목 ID
  ingredientName: string; // e.g. "에스프레소 원두", "서울우유 1L", "바닐라 시럽"
  requiredQuantity: number; // 투입량 (e.g. 18, 200, 30)
  unit: 'g' | 'ml' | 'piece' | 'shot'; // 단위
  costPerUnit: number; // 단위당 원가 (e.g. 1g당 30원, 1ml당 2.5원)
}

export interface RecipeItem {
  id: string;
  menuCode: string; // e.g. "BEV-001"
  menuName: string; // e.g. "시그니처 바닐라 빈 라떼"
  category: 'coffee' | 'beverage' | 'dessert' | 'food';
  sellingPrice: number; // 판매가 (e.g. 5,500원)
  ingredients: RecipeIngredient[];
  preparationMinutes?: number;
}

export interface MenuCostAnalysis {
  recipeId: string;
  menuName: string;
  sellingPrice: number;
  totalCostPrice: number; // 총 식자재 투입 원가
  marginAmount: number; // 마진 금액 (판매가 - 원가)
  costRatioPercent: number; // 원가율 % (원가 / 판매가 * 100)
  marginRatioPercent: number; // 마진율 % (마진 / 판매가 * 100)
}

export interface IngredientDeduction {
  inventoryItemId: string;
  ingredientName: string;
  unit: string;
  totalDeductedQuantity: number;
  totalCost: number;
}

export interface BatchConsumptionResult {
  totalOrderCount: number;
  totalSalesAmount: number;
  totalCostAmount: number;
  grossMarginAmount: number;
  averageCostRatioPercent: number;
  ingredientDeductions: IngredientDeduction[];
}

/**
 * 1. 단일 메뉴 식자재 원가 및 마진율 산출 (순수 함수)
 */
export function calculateMenuCost(recipe: RecipeItem): MenuCostAnalysis {
  let totalCostPrice = 0;
  for (const ing of recipe.ingredients) {
    totalCostPrice += ing.requiredQuantity * ing.costPerUnit;
  }
  totalCostPrice = Math.round(totalCostPrice);

  const marginAmount = Math.max(0, recipe.sellingPrice - totalCostPrice);
  const costRatioPercent =
    recipe.sellingPrice > 0
      ? Math.round((totalCostPrice / recipe.sellingPrice) * 1000) / 10
      : 0;
  const marginRatioPercent =
    recipe.sellingPrice > 0
      ? Math.round((marginAmount / recipe.sellingPrice) * 1000) / 10
      : 0;

  return {
    recipeId: recipe.id,
    menuName: recipe.menuName,
    sellingPrice: recipe.sellingPrice,
    totalCostPrice,
    marginAmount,
    costRatioPercent,
    marginRatioPercent,
  };
}

/**
 * 2. 복수 주문 건에 대한 식자재 BOM 일괄 소모 차감량 계산 (순수 함수)
 */
export function calculateBatchConsumption(
  orders: readonly { recipeId: string; quantity: number }[],
  recipes: readonly RecipeItem[]
): BatchConsumptionResult {
  const recipeMap = new Map<string, RecipeItem>();
  for (const r of recipes) {
    recipeMap.set(r.id, r);
  }

  const deductionMap = new Map<string, IngredientDeduction>();
  let totalOrderCount = 0;
  let totalSalesAmount = 0;
  let totalCostAmount = 0;

  for (const order of orders) {
    const recipe = recipeMap.get(order.recipeId);
    if (!recipe) continue;

    totalOrderCount += order.quantity;
    totalSalesAmount += recipe.sellingPrice * order.quantity;

    for (const ing of recipe.ingredients) {
      const consumedQty = ing.requiredQuantity * order.quantity;
      const consumedCost = consumedQty * ing.costPerUnit;
      totalCostAmount += consumedCost;

      const existing = deductionMap.get(ing.inventoryItemId);
      if (existing) {
        existing.totalDeductedQuantity += consumedQty;
        existing.totalCost += Math.round(consumedCost);
      } else {
        deductionMap.set(ing.inventoryItemId, {
          inventoryItemId: ing.inventoryItemId,
          ingredientName: ing.ingredientName,
          unit: ing.unit,
          totalDeductedQuantity: consumedQty,
          totalCost: Math.round(consumedCost),
        });
      }
    }
  }

  totalCostAmount = Math.round(totalCostAmount);
  const grossMarginAmount = Math.max(0, totalSalesAmount - totalCostAmount);
  const averageCostRatioPercent =
    totalSalesAmount > 0
      ? Math.round((totalCostAmount / totalSalesAmount) * 1000) / 10
      : 0;

  return {
    totalOrderCount,
    totalSalesAmount,
    totalCostAmount,
    grossMarginAmount,
    averageCostRatioPercent,
    ingredientDeductions: Array.from(deductionMap.values()),
  };
}

export interface BomStockDeductionItem {
  inventoryItemId: string;
  ingredientName: string;
  unit: string;
  requiredQuantity: number;
  currentStock: number;
  remainingStock: number;
  isShortage: boolean;
  shortageQuantity: number;
  cost: number;
}

export interface BomStockDeductionResult {
  hasShortage: boolean;
  totalCost: number;
  items: BomStockDeductionItem[];
  stockMovementPayloads: Array<{
    inventoryItemId: string;
    changeQuantity: number;
    reason: string;
  }>;
}

/**
 * 3. 완제품 생산/출하 시 원자재 재고 일괄 차감(BOM Explosion) 및 재고 부족 검증
 */
export function executeBomStockDeduction(params: {
  orders: readonly { recipeId: string; quantity: number }[];
  recipes: readonly RecipeItem[];
  stockLevels: Record<string, number>;
}): BomStockDeductionResult {
  const batchResult = calculateBatchConsumption(params.orders, params.recipes);
  const items: BomStockDeductionItem[] = [];
  const stockMovementPayloads: Array<{
    inventoryItemId: string;
    changeQuantity: number;
    reason: string;
  }> = [];

  let hasShortage = false;

  for (const deduction of batchResult.ingredientDeductions) {
    const currentStock = params.stockLevels[deduction.inventoryItemId] ?? 0;
    const required = deduction.totalDeductedQuantity;
    const remainingStock = currentStock - required;
    const isShortage = remainingStock < 0;
    const shortageQuantity = isShortage ? Math.abs(remainingStock) : 0;

    if (isShortage) {
      hasShortage = true;
    }

    items.push({
      inventoryItemId: deduction.inventoryItemId,
      ingredientName: deduction.ingredientName,
      unit: deduction.unit,
      requiredQuantity: required,
      currentStock,
      remainingStock,
      isShortage,
      shortageQuantity,
      cost: deduction.totalCost,
    });

    stockMovementPayloads.push({
      inventoryItemId: deduction.inventoryItemId,
      changeQuantity: -required,
      reason: 'BOM_PRODUCTION_CONSUMPTION',
    });
  }

  return {
    hasShortage,
    totalCost: batchResult.totalCostAmount,
    items,
    stockMovementPayloads,
  };
}

export interface CostSimulationResult {
  recipeId: string;
  menuName: string;
  sellingPrice: number;
  originalCostPrice: number;
  updatedCostPrice: number;
  deltaCost: number;
  originalMarginRatioPercent: number;
  updatedMarginRatioPercent: number;
  deltaMarginRatioPercent: number;
  suggestedSellingPrice: number;
}

/**
 * 4. 원자재 매입단가 변동 시 완제품 원가/마진율 실시간 시뮬레이션 및 권장 판매가 산출
 */
export function recalculateRecipeCostWithUpdatedIngredientPrice(
  recipe: RecipeItem,
  updatedPrices: Record<string, number>,
  targetMarginRatioPercent: number = 75
): CostSimulationResult {
  const originalCost = calculateMenuCost(recipe);

  let updatedCostPrice = 0;
  for (const ing of recipe.ingredients) {
    const unitPrice =
      updatedPrices[ing.inventoryItemId] !== undefined
        ? updatedPrices[ing.inventoryItemId]
        : ing.costPerUnit;
    updatedCostPrice += ing.requiredQuantity * unitPrice;
  }
  updatedCostPrice = Math.round(updatedCostPrice);

  const updatedMarginAmount = Math.max(0, recipe.sellingPrice - updatedCostPrice);
  const updatedMarginRatioPercent =
    recipe.sellingPrice > 0
      ? Math.round((updatedMarginAmount / recipe.sellingPrice) * 1000) / 10
      : 0;

  const deltaCost = updatedCostPrice - originalCost.totalCostPrice;
  const deltaMarginRatioPercent =
    Math.round((updatedMarginRatioPercent - originalCost.marginRatioPercent) * 10) / 10;

  const marginFraction = Math.max(0.01, Math.min(0.99, targetMarginRatioPercent / 100));
  const rawSuggestedPrice = updatedCostPrice / (1 - marginFraction);
  const suggestedSellingPrice = Math.ceil(rawSuggestedPrice / 100) * 100;

  return {
    recipeId: recipe.id,
    menuName: recipe.menuName,
    sellingPrice: recipe.sellingPrice,
    originalCostPrice: originalCost.totalCostPrice,
    updatedCostPrice,
    deltaCost,
    originalMarginRatioPercent: originalCost.marginRatioPercent,
    updatedMarginRatioPercent,
    deltaMarginRatioPercent,
    suggestedSellingPrice,
  };
}

