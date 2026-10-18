import {
  RecipeItem,
  calculateMenuCost,
  calculateBatchConsumption,
  executeBomStockDeduction,
  recalculateRecipeCostWithUpdatedIngredientPrice,
} from './recipeBomEngine';

function runTests() {
  console.log('--- Testing recipeBomEngine ---');

  // Test 1: 단일 메뉴 레시피 원가 및 마진율 산출
  const vanillaLatte: RecipeItem = {
    id: 'rec-1',
    menuCode: 'BEV-001',
    menuName: '바닐라 빈 라떼',
    category: 'coffee',
    sellingPrice: 5500,
    ingredients: [
      {
        inventoryItemId: 'ing-coffee',
        ingredientName: '에스프레소 원두',
        requiredQuantity: 18,
        unit: 'g',
        costPerUnit: 25, // 18 * 25 = 450원
      },
      {
        inventoryItemId: 'ing-milk',
        ingredientName: '신선 우유',
        requiredQuantity: 200,
        unit: 'ml',
        costPerUnit: 2.5, // 200 * 2.5 = 500원
      },
      {
        inventoryItemId: 'ing-syrup',
        ingredientName: '마다가스카르 바닐라 시럽',
        requiredQuantity: 30,
        unit: 'ml',
        costPerUnit: 10, // 30 * 10 = 300원
      },
    ],
  };

  const costAnalysis = calculateMenuCost(vanillaLatte);
  // 원가: 450 + 500 + 300 = 1250원
  if (costAnalysis.totalCostPrice !== 1250) {
    throw new Error(`Expected total cost 1,250, got ${costAnalysis.totalCostPrice}`);
  }
  // 마진: 5500 - 1250 = 4250원
  if (costAnalysis.marginAmount !== 4250) {
    throw new Error(`Expected margin 4,250, got ${costAnalysis.marginAmount}`);
  }
  // 원가율: (1250 / 5500) * 100 = 22.7%
  if (costAnalysis.costRatioPercent !== 22.7) {
    throw new Error(`Expected cost ratio 22.7%, got ${costAnalysis.costRatioPercent}`);
  }
  // 마진율: (4250 / 5500) * 100 = 77.3%
  if (costAnalysis.marginRatioPercent !== 77.3) {
    throw new Error(`Expected margin ratio 77.3%, got ${costAnalysis.marginRatioPercent}`);
  }
  console.log('✅ Test 1 passed: Single menu recipe cost and margin analysis');

  // Test 2: 복수 주문 식자재 자동 소모 BOM 차감량 계산
  const americano: RecipeItem = {
    id: 'rec-2',
    menuCode: 'BEV-002',
    menuName: '아메리카노',
    category: 'coffee',
    sellingPrice: 4000,
    ingredients: [
      {
        inventoryItemId: 'ing-coffee',
        ingredientName: '에스프레소 원두',
        requiredQuantity: 18,
        unit: 'g',
        costPerUnit: 25, // 450원
      },
    ],
  };

  const orders = [
    { recipeId: 'rec-1', quantity: 2 }, // 라떼 2잔
    { recipeId: 'rec-2', quantity: 3 }, // 아메리카노 3잔
  ];

  const batchResult = calculateBatchConsumption(orders, [vanillaLatte, americano]);
  // 총 주문: 5잔
  if (batchResult.totalOrderCount !== 5) {
    throw new Error(`Expected 5 total orders, got ${batchResult.totalOrderCount}`);
  }
  // 총 매출: (5500 * 2) + (4000 * 3) = 11000 + 12000 = 23,000원
  if (batchResult.totalSalesAmount !== 23000) {
    throw new Error(`Expected sales 23,000, got ${batchResult.totalSalesAmount}`);
  }
  // 원두 총 소모: (18 * 2) + (18 * 3) = 90g
  const coffeeDeduction = batchResult.ingredientDeductions.find(
    (d) => d.inventoryItemId === 'ing-coffee'
  );
  if (!coffeeDeduction || coffeeDeduction.totalDeductedQuantity !== 90) {
    throw new Error(`Expected 90g coffee consumed, got ${coffeeDeduction?.totalDeductedQuantity}`);
  }
  // 우유 총 소모: 200 * 2 = 400ml
  const milkDeduction = batchResult.ingredientDeductions.find(
    (d) => d.inventoryItemId === 'ing-milk'
  );
  if (!milkDeduction || milkDeduction.totalDeductedQuantity !== 400) {
    throw new Error(`Expected 400ml milk consumed, got ${milkDeduction?.totalDeductedQuantity}`);
  }

  console.log('✅ Test 2 passed: Batch orders BOM explosion and inventory deduction');

  // Test 3: 완제품 출하 시 원자재 재고 차감 및 재고 부족(Shortage) 검증
  const stockLevels = {
    'ing-coffee': 100, // 90g 필요 -> 10g 남음
    'ing-milk': 300,   // 400ml 필요 -> 100ml 부족!
    'ing-syrup': 100,  // 60ml 필요 -> 40ml 남음
  };

  const deductionResult = executeBomStockDeduction({
    orders,
    recipes: [vanillaLatte, americano],
    stockLevels,
  });

  if (!deductionResult.hasShortage) {
    throw new Error('Expected shortage to be detected due to insufficient milk');
  }

  const milkItem = deductionResult.items.find((i) => i.inventoryItemId === 'ing-milk');
  if (!milkItem || !milkItem.isShortage || milkItem.shortageQuantity !== 100) {
    throw new Error(`Expected 100ml milk shortage, got ${milkItem?.shortageQuantity}`);
  }

  const coffeeItem = deductionResult.items.find((i) => i.inventoryItemId === 'ing-coffee');
  if (!coffeeItem || coffeeItem.isShortage || coffeeItem.remainingStock !== 10) {
    throw new Error(`Expected 10g remaining coffee, got ${coffeeItem?.remainingStock}`);
  }

  if (deductionResult.stockMovementPayloads.length !== 3) {
    throw new Error(`Expected 3 stock movement payloads, got ${deductionResult.stockMovementPayloads.length}`);
  }
  console.log('✅ Test 3 passed: BOM stock deduction and shortage detection');

  // Test 4: 원자재 매입단가 인상 시 원가/마진율 실시간 시뮬레이션 및 권장 판매가 제안
  // 원두 25원 -> 35원 (+10원), 우유 2.5원 -> 3.5원 (+1원), 시럽 10원 유지
  // 신규 원가: (18 * 35) + (200 * 3.5) + (30 * 10) = 630 + 700 + 300 = 1630원 (기존 1250원에서 +380원 인상)
  const simulation = recalculateRecipeCostWithUpdatedIngredientPrice(
    vanillaLatte,
    {
      'ing-coffee': 35,
      'ing-milk': 3.5,
    },
    75 // 목표 마진율 75%
  );

  if (simulation.updatedCostPrice !== 1630) {
    throw new Error(`Expected updated cost 1,630, got ${simulation.updatedCostPrice}`);
  }
  if (simulation.deltaCost !== 380) {
    throw new Error(`Expected delta cost +380, got ${simulation.deltaCost}`);
  }
  // 신규 마진율: (5500 - 1630) / 5500 * 100 = 3870 / 5500 = 70.4%
  if (simulation.updatedMarginRatioPercent !== 70.4) {
    throw new Error(`Expected updated margin ratio 70.4%, got ${simulation.updatedMarginRatioPercent}`);
  }
  // 목표 마진율 75%를 달성하기 위한 권장 판매가 = 1630 / (1 - 0.75) = 1630 / 0.25 = 6520 -> 100원 올림 6600원
  if (simulation.suggestedSellingPrice !== 6600) {
    throw new Error(`Expected suggested price 6,600, got ${simulation.suggestedSellingPrice}`);
  }
  console.log('✅ Test 4 passed: Ingredient price update simulation & suggested price');

  console.log('🎉 All recipeBomEngine tests passed!');
}

runTests();
