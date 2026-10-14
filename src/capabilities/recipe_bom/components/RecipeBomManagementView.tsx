import React, { useState, useEffect, useMemo } from 'react';
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
  type RecipeItem,
  type RecipeIngredient,
} from '../domain/recipeBomEngine';

const STORAGE_KEY_RECIPES = 'moa_recipe_bom_items';

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
    menuName: '아이스 아메리카노 (클래식)',
    category: 'coffee',
    sellingPrice: 4500,
    preparationMinutes: 2,
    ingredients: [
      {
        inventoryItemId: 'ing-1',
        ingredientName: '스페셜티 에스프레소 원두',
        requiredQuantity: 18,
        unit: 'g',
        costPerUnit: 25,
      },
      {
        inventoryItemId: 'ing-4',
        ingredientName: '테이크아웃 친환경 컵&리드',
        requiredQuantity: 1,
        unit: 'piece',
        costPerUnit: 120,
      },
    ],
  },
  {
    id: 'rec-3',
    menuCode: 'FOOD-001',
    menuName: '바질 토마토 파니니 샌드위치',
    category: 'food',
    sellingPrice: 8500,
    preparationMinutes: 8,
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
  const [recipes, setRecipes] = useState<RecipeItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECIPES);
      return saved ? JSON.parse(saved) : DEFAULT_RECIPES;
    } catch {
      return DEFAULT_RECIPES;
    }
  });

  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(DEFAULT_RECIPES[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [simulatedQuantity, setSimulatedQuantity] = useState<number>(10);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECIPES, JSON.stringify(recipes));
    } catch {}
  }, [recipes]);

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId) || recipes[0];
  const selectedCost = useMemo(() => calculateMenuCost(selectedRecipe), [selectedRecipe]);

  const simulationResult = useMemo(() => {
    return calculateBatchConsumption(
      [{ recipeId: selectedRecipe.id, quantity: simulatedQuantity }],
      recipes
    );
  }, [selectedRecipe, simulatedQuantity, recipes]);

  const overallAnalysis = useMemo(() => {
    const analyses = recipes.map((r) => calculateMenuCost(r));
    const totalCost = analyses.reduce((acc, a) => acc + a.totalCostPrice, 0);
    const totalSales = analyses.reduce((acc, a) => acc + a.sellingPrice, 0);
    const avgMargin =
      totalSales > 0 ? Math.round(((totalSales - totalCost) / totalSales) * 1000) / 10 : 0;
    return {
      menuCount: recipes.length,
      averageMarginRatio: avgMargin,
    };
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return recipes;
    const q = searchQuery.toLowerCase();
    return recipes.filter(
      (r) => r.menuName.toLowerCase().includes(q) || r.menuCode.toLowerCase().includes(q)
    );
  }, [recipes, searchQuery]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <UtensilsCrossed className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900">식자재 레시피 & 자동 소모 BOM 원가 관리</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
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
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-sm font-medium">BOM 등록 메뉴 수</span>
            <Coffee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{overallAnalysis.menuCount}개</div>
          <p className="text-xs text-gray-400 mt-1">원재료 레시피 연결 완료</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-sm font-medium">평균 목표 마진율</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{overallAnalysis.averageMarginRatio}%</div>
          <p className="text-xs text-gray-400 mt-1">식자재 원가율 {Math.round((100 - overallAnalysis.averageMarginRatio) * 10) / 10}%</p>
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="메뉴명 검색..."
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                      : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-gray-900">{r.menuName}</span>
                    <span className="text-xs text-gray-400 font-mono">{r.menuCode}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs">
                    <span className="text-gray-500">{r.sellingPrice.toLocaleString()}원</span>
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
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  {selectedRecipe.menuCode}
                </span>
                <h2 className="text-xl font-bold text-gray-900 mt-1">{selectedRecipe.menuName}</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-gray-400">판매 가격</div>
                  <div className="text-lg font-bold text-gray-900">
                    {selectedRecipe.sellingPrice.toLocaleString()}원
                  </div>
                </div>
                <div className="text-right border-l pl-3">
                  <div className="text-xs text-gray-400">투입 원가 (원가율)</div>
                  <div className="text-lg font-bold text-emerald-600">
                    {selectedCost.totalCostPrice.toLocaleString()}원 ({selectedCost.costRatioPercent}%)
                  </div>
                </div>
              </div>
            </div>

            {/* 식자재 투입 목록 (BOM 테이블) */}
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>구성 원자재 레시피 (BOM)</span>
              </h3>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase border-b">
                    <tr>
                      <th className="py-2 px-3">원재료명</th>
                      <th className="py-2 px-3 text-right">1회 투입량</th>
                      <th className="py-2 px-3 text-right">단위 원가</th>
                      <th className="py-2 px-3 text-right">원가 기여액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedRecipe.ingredients.map((ing) => {
                      const ingCost = Math.round(ing.requiredQuantity * ing.costPerUnit);
                      return (
                        <tr key={ing.inventoryItemId} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3 font-medium text-gray-900">
                            {ing.ingredientName}
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-700">
                            {ing.requiredQuantity} {ing.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-500">
                            {ing.costPerUnit}원/{ing.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-gray-900">
                            {ingCost.toLocaleString()}원
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 주문 시뮬레이터 및 자동 소모 차감량 */}
            <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>주문 수량별 식자재 자동 소모 시뮬레이션</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">주문량:</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={simulatedQuantity}
                    onChange={(e) => setSimulatedQuantity(Number(e.target.value) || 1)}
                    className="w-16 px-2 py-1 text-xs border rounded bg-white font-bold text-center"
                  />
                  <span className="text-xs text-slate-500">잔 판매 시</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {simulationResult.ingredientDeductions.map((d) => (
                  <div key={d.inventoryItemId} className="bg-white p-2.5 rounded-lg border text-xs">
                    <div className="text-gray-500 truncate">{d.ingredientName}</div>
                    <div className="font-bold text-emerald-700 text-sm mt-0.5">
                      -{d.totalDeductedQuantity.toLocaleString()} {d.unit}
                    </div>
                    <div className="text-gray-400 text-[11px] mt-0.5">
                      원가 {d.totalCost.toLocaleString()}원
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
