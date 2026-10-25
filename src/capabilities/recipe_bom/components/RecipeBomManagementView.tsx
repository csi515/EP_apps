import React, { useState, useMemo } from 'react';
import { useGenericEntityRecords } from '@/core/storage/useGenericEntityRecords';
import {
  UtensilsCrossed,
  Layers,
  TrendingUp,
  Percent,
  PlusCircle,
  Search,
  AlertCircle,
  CheckCircle2,
  Coffee,
  Sparkles,
  ArrowRight,
  Boxes,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  calculateMenuCost,
  calculateBatchConsumption,
  executeBomStockDeduction,
  recalculateRecipeCostWithUpdatedIngredientPrice,
  type RecipeItem,
  type RecipeIngredient,
  type CostSimulationResult,
} from '../domain/recipeBomEngine';

const DEFAULT_RECIPES: RecipeItem[] = [
  {
    id: 'rec-1',
    menuCode: 'BEV-001',
    menuName: '시그니처 바닐라 빈 라떼',
    category: 'coffee',
    sellingPrice: 5800,
    preparationMinutes: 3,
    ingredients: [
      {
        inventoryItemId: 'ing-1',
        ingredientName: '스페셜티 에스프레소 원두',
        requiredQuantity: 18,
        unit: 'g',
        costPerUnit: 25,
      },
      {
        inventoryItemId: 'ing-2',
        ingredientName: '신선 1등급 우유',
        requiredQuantity: 200,
        unit: 'ml',
        costPerUnit: 2.4,
      },
      {
        inventoryItemId: 'ing-3',
        ingredientName: '수제 바닐라 빈 시럽',
        requiredQuantity: 30,
        unit: 'ml',
        costPerUnit: 12,
      },
    ],
  },
  {
    id: 'rec-2',
    menuCode: 'BEV-002',
    menuName: '제주 유기농 말차 플랫화이트',
    category: 'beverage',
    sellingPrice: 6200,
    preparationMinutes: 4,
    ingredients: [
      {
        inventoryItemId: 'ing-4',
        ingredientName: '제주 유기농 말차 파우더',
        requiredQuantity: 15,
        unit: 'g',
        costPerUnit: 55,
      },
      {
        inventoryItemId: 'ing-2',
        ingredientName: '신선 1등급 우유',
        requiredQuantity: 160,
        unit: 'ml',
        costPerUnit: 2.4,
      },
      {
        inventoryItemId: 'ing-1',
        ingredientName: '스페셜티 에스프레소 원두',
        requiredQuantity: 9,
        unit: 'g',
        costPerUnit: 25,
      },
    ],
  },
  {
    id: 'rec-3',
    menuCode: 'BAK-001',
    menuName: '바질 토마토 치아바타 샌드위치',
    category: 'food',
    sellingPrice: 7500,
    preparationMinutes: 6,
    ingredients: [
      {
        inventoryItemId: 'ing-5',
        ingredientName: '치아바타 빵',
        requiredQuantity: 1,
        unit: 'piece',
        costPerUnit: 1200,
      },
      {
        inventoryItemId: 'ing-6',
        ingredientName: '생 모짜렐라 치즈',
        requiredQuantity: 70,
        unit: 'g',
        costPerUnit: 18,
      },
      {
        inventoryItemId: 'ing-7',
        ingredientName: '바질 페스토 소스',
        requiredQuantity: 25,
        unit: 'g',
        costPerUnit: 20,
      },
    ],
  },
];

export const RecipeBomManagementView: React.FC = () => {
  const { records: recipes, isLoading } = useGenericEntityRecords<RecipeItem>({
    entityType: 'recipe_bom',
    defaultRecords: DEFAULT_RECIPES,
    idExtractor: (r) => r.id,
    recordKeyExtractor: (r) => r.menuCode,
  });

  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(DEFAULT_RECIPES[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [simulatedQuantity, setSimulatedQuantity] = useState<number>(10);
  const [targetMarginRatio, setTargetMarginRatio] = useState<number>(75);
  const [updatedPrices, setUpdatedPrices] = useState<Record<string, number>>({});
  const [stockLevels, setStockLevels] = useState<Record<string, number>>({
    'ing-1': 500, // 원두 500g
    'ing-2': 3000, // 우유 3000ml
    'ing-3': 400, // 시럽 400ml
    'ing-4': 200, // 말차 200g
    'ing-5': 15, // 빵 15개
    'ing-6': 800, // 치즈 800g
    'ing-7': 300, // 페스토 300g
  });

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId) || recipes[0] || DEFAULT_RECIPES[0];
  const selectedCost = useMemo(() => calculateMenuCost(selectedRecipe), [selectedRecipe]);

  // 원자재 단가 변동 시뮬레이션
  const priceSimulation = useMemo(() => {
    return recalculateRecipeCostWithUpdatedIngredientPrice(
      selectedRecipe,
      updatedPrices,
      targetMarginRatio
    );
  }, [selectedRecipe, updatedPrices, targetMarginRatio]);

  // BOM 자동 소모 및 재고 부족 검증
  const bomDeduction = useMemo(() => {
    return executeBomStockDeduction({
      orders: [{ recipeId: selectedRecipe.id, quantity: simulatedQuantity }],
      recipes: recipes.length > 0 ? recipes : DEFAULT_RECIPES,
      stockLevels,
    });
  }, [selectedRecipe, simulatedQuantity, recipes, stockLevels]);

  const handlePriceChange = (itemId: string, newPrice: number) => {
    setUpdatedPrices((prev) => ({
      ...prev,
      [itemId]: newPrice,
    }));
  };

  const handleResetPrices = () => {
    setUpdatedPrices({});
    showToast('원자재 매입단가를 기본값으로 초기화했습니다.', 'info');
  };

  const handleExecuteDeduction = () => {
    if (bomDeduction.hasShortage) {
      showToast('일부 원자재의 재고가 부족합니다. 안전재고를 확인하세요.', 'warning');
    }
    // 재고 반영
    setStockLevels((prev) => {
      const next = { ...prev };
      for (const item of bomDeduction.items) {
        next[item.inventoryItemId] = item.remainingStock;
      }
      return next;
    });
    showToast(
      `[BOM 자동 소모] ${selectedRecipe.menuName} ${simulatedQuantity}건 원자재 재고가 일괄 차감되었습니다.`,
      'success'
    );
  };

  const simulationResult = useMemo(() => {
    return calculateBatchConsumption(
      [{ recipeId: selectedRecipe.id, quantity: simulatedQuantity }],
      recipes.length > 0 ? recipes : DEFAULT_RECIPES
    );
  }, [selectedRecipe, simulatedQuantity, recipes]);

  const overallAnalysis = useMemo(() => {
    const listToAnalyze = recipes.length > 0 ? recipes : DEFAULT_RECIPES;
    const analyses = listToAnalyze.map((r) => calculateMenuCost(r));
    const totalCost = analyses.reduce((acc, a) => acc + a.totalCostPrice, 0);
    const totalSales = analyses.reduce((acc, a) => acc + a.sellingPrice, 0);
    const avgMargin =
      totalSales > 0 ? Math.round(((totalSales - totalCost) / totalSales) * 1000) / 10 : 0;
    return {
      menuCount: listToAnalyze.length,
      averageMarginRatio: avgMargin,
    };
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const sourceList = recipes.length > 0 ? recipes : DEFAULT_RECIPES;
    if (!searchQuery.trim()) return sourceList;
    const q = searchQuery.toLowerCase();
    return sourceList.filter(
      (r) => r.menuName.toLowerCase().includes(q) || r.menuCode.toLowerCase().includes(q)
    );
  }, [recipes, searchQuery]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <UtensilsCrossed className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">식자재 레시피 & 자동 소모 BOM 원가 관리</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            메뉴별 원재료 배합비(BOM)를 설정하여 주문 시 식자재 재고를 자동 감량하고 원가율·마진율을 실시간 분석합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => showToast('신규 레시피 등록 모달이 열립니다.', 'info')}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
          >
            <PlusCircle className="w-4 h-4" />
            레시피 등록
          </button>
        </div>
      </div>

      {/* 상단 메트릭 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-medium">BOM 등록 메뉴 수</span>
            <Coffee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{overallAnalysis.menuCount}개</div>
          <p className="text-xs text-slate-400 mt-1">원재료 레시피 연결 완료</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-medium">평균 목표 마진율</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{overallAnalysis.averageMarginRatio}%</div>
          <p className="text-xs text-slate-400 mt-1">식자재 원가율 {Math.round((100 - overallAnalysis.averageMarginRatio) * 10) / 10}%</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-sm">
          <div className="flex items-center justify-between text-emerald-800 mb-2">
            <span className="text-sm font-medium">자동 재고 감량 연동</span>
            <Boxes className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">실시간 가동 중</div>
          <p className="text-xs text-emerald-600 mt-1">주방 주문 즉시 원자재 소모 차감</p>
        </div>
      </div>

      {/* 메뉴 선택 및 레시피 상세 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 메뉴 목록 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="메뉴명 검색..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {filteredRecipes.map((r) => {
              const cost = calculateMenuCost(r);
              const isSelected = r.id === selectedRecipe.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRecipeId(r.id)}
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/60 shadow-xs'
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-900">{r.menuName}</span>
                    <span className="text-xs text-slate-400 font-mono">{r.menuCode}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs">
                    <span className="text-slate-500">{r.sellingPrice.toLocaleString()}원</span>
                    <span className="font-semibold text-emerald-700">
                      마진 {cost.marginRatioPercent}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 우측 2칸: 선택된 메뉴 레시피 BOM 및 원가 분해 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  {selectedRecipe.menuCode}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">{selectedRecipe.menuName}</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-slate-400">판매 가격</div>
                  <div className="text-lg font-bold text-slate-900">
                    {selectedRecipe.sellingPrice.toLocaleString()}원
                  </div>
                </div>
                <div className="text-right border-l pl-3">
                  <div className="text-xs text-slate-400">투입 원가 (원가율)</div>
                  <div className="text-lg font-bold text-emerald-600">
                    {selectedCost.totalCostPrice.toLocaleString()}원 ({selectedCost.costRatioPercent}%)
                  </div>
                </div>
              </div>
            </div>

            {/* 식자재 투입 목록 (BOM 테이블) */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>구성 원자재 레시피 (BOM)</span>
              </h3>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase border-b">
                    <tr>
                      <th className="py-2 px-3">원재료명</th>
                      <th className="py-2 px-3 text-right">1회 투입량</th>
                      <th className="py-2 px-3 text-right">단위 원가</th>
                      <th className="py-2 px-3 text-right">원가 기여액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedRecipe.ingredients.map((ing) => {
                      const currentUnitPrice =
                        updatedPrices[ing.inventoryItemId] !== undefined
                          ? updatedPrices[ing.inventoryItemId]
                          : ing.costPerUnit;
                      const ingCost = Math.round(ing.requiredQuantity * currentUnitPrice);
                      const isPriceChanged = updatedPrices[ing.inventoryItemId] !== undefined;

                      return (
                        <tr key={ing.inventoryItemId} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {ing.ingredientName}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700">
                            {ing.requiredQuantity} {ing.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-500">
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                step="0.1"
                                value={currentUnitPrice}
                                onChange={(e) =>
                                  handlePriceChange(ing.inventoryItemId, Number(e.target.value) || 0)
                                }
                                className={`w-18 px-1.5 py-0.5 text-right font-mono text-xs border rounded ${
                                  isPriceChanged
                                    ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold'
                                    : 'border-slate-200'
                                }`}
                              />
                              <span>원/{ing.unit}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                            {ingCost.toLocaleString()}원
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 원자재 매입단가 변동 시뮬레이터 & 권장 판매가 제안 카드 */}
            <div className="p-4 bg-gradient-to-r from-amber-50/80 to-orange-50/80 rounded-xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-amber-600" />
                  <span>원자재 매입단가 변동 및 권장 판매가 시뮬레이터</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-amber-700">목표 마진율:</span>
                  <input
                    type="number"
                    min="30"
                    max="95"
                    value={targetMarginRatio}
                    onChange={(e) => setTargetMarginRatio(Number(e.target.value) || 75)}
                    className="w-12 px-1 py-0.5 text-xs text-center border border-amber-300 rounded bg-white font-bold"
                  />
                  <span className="text-[11px] text-amber-700">%</span>
                  {Object.keys(updatedPrices).length > 0 && (
                    <button
                      type="button"
                      onClick={handleResetPrices}
                      className="ml-2 text-[10px] text-amber-800 underline hover:text-amber-950"
                    >
                      단가 초기화
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white/90 p-2.5 rounded-lg border border-amber-100">
                  <div className="text-[10px] text-slate-500">예상 제조원가</div>
                  <div className="text-sm font-black text-slate-900">
                    {priceSimulation.updatedCostPrice.toLocaleString()}원
                  </div>
                  <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                    {priceSimulation.deltaCost >= 0
                      ? `+${priceSimulation.deltaCost.toLocaleString()}원 인상`
                      : `${priceSimulation.deltaCost.toLocaleString()}원 절감`}
                  </div>
                </div>

                <div className="bg-white/90 p-2.5 rounded-lg border border-amber-100">
                  <div className="text-[10px] text-slate-500">예상 마진율</div>
                  <div className="text-sm font-black text-emerald-700">
                    {priceSimulation.updatedMarginRatioPercent}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    기존 대비 {priceSimulation.deltaMarginRatioPercent >= 0 ? '+' : ''}
                    {priceSimulation.deltaMarginRatioPercent}%p
                  </div>
                </div>

                <div className="bg-white/90 p-2.5 rounded-lg border border-amber-100 col-span-2">
                  <div className="text-[10px] text-slate-500">
                    목표 마진율({targetMarginRatio}%) 달성 권장 판매가
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-base font-black text-amber-900">
                      {priceSimulation.suggestedSellingPrice.toLocaleString()}원
                    </span>
                    <span className="text-[10px] text-slate-500">
                      (현재가 대비 +{(priceSimulation.suggestedSellingPrice - selectedRecipe.sellingPrice).toLocaleString()}원 조정 필요)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 주문 시뮬레이터 및 자동 소모 차감량 (BOM Explosion) */}
            <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>주문 수량별 식자재 자동 소모 & 재고 차감 (BOM Explosion)</span>
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">주문량:</span>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={simulatedQuantity}
                      onChange={(e) => setSimulatedQuantity(Number(e.target.value) || 1)}
                      className="w-16 px-2 py-1 text-xs border rounded bg-white font-bold text-center"
                    />
                    <span className="text-xs text-slate-500">잔</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleExecuteDeduction}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                  >
                    BOM 즉시 재고 차감
                  </button>
                </div>
              </div>

              {bomDeduction.hasShortage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    일부 원자재의 재고가 부족합니다! 주문 제작 전 발주(Supply Restock)가 필요합니다.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {bomDeduction.items.map((item) => (
                  <div
                    key={item.inventoryItemId}
                    className={`p-2.5 rounded-lg border text-xs ${
                      item.isShortage
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="font-semibold truncate">{item.ingredientName}</div>
                    <div className="font-black text-emerald-700 text-sm mt-0.5">
                      소모: -{item.requiredQuantity.toLocaleString()} {item.unit}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex justify-between">
                      <span>잔여재고: {item.remainingStock.toLocaleString()} {item.unit}</span>
                      {item.isShortage && (
                        <span className="font-bold text-rose-600">
                          {item.shortageQuantity} {item.unit} 부족
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
