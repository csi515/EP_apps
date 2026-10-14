import {
  RecipeItem,
  calculateMenuCost,
  calculateBatchConsumption,
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
  console.log('🎉 All recipeBomEngine tests passed!');
}

runTests();
