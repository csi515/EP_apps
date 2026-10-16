import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import {
  detectRestockNeeded,
  groupRestockItemsByVendor,
  assemblePurchaseOrder,
  type RestockItem,
  type GeneratedPurchaseOrder,
} from '../domain/supplyRestockEngine';

export const SupplyRestockView: React.FC = () => {
  const { query } = useList<RestockItem>({
    resource: 'supply_restock_items',
    sorters: [{ field: 'current_quantity', order: 'asc' }],
  });

  const items = query?.data?.data ?? [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createItem } = useCreate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('stationery');
  const [currentQty, setCurrentQty] = useState(3);
  const [safetyThreshold, setSafetyThreshold] = useState(5);
  const [orderQty, setOrderQty] = useState(10);
  const [unit, setUnit] = useState('BOX');
  const [unitCost, setUnitCost] = useState(15000);
  const [vendorName, setVendorName] = useState('대한문구');
  const [vendorContact, setVendorContact] = useState('010-0000-0000');

  // 생성된 발주서 모달 상태
  const [activePo, setActivePo] = useState<GeneratedPurchaseOrder | null>(null);

  const neededItems = detectRestockNeeded(items);
  const vendorGroups = groupRestockItemsByVendor(neededItems);

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !vendorName) return;

    createItem(
      {
        resource: 'supply_restock_items',
        values: {
          item_name: itemName,
          category,
          current_quantity: Number(currentQty),
          safety_threshold: Number(safetyThreshold),
          optimal_order_quantity: Number(orderQty),
          unit,
          unit_cost: Number(unitCost),
          vendor_name: vendorName,
          vendor_contact: vendorContact || null,
          status: Number(currentQty) <= Number(safetyThreshold) ? 'restock_needed' : 'sufficient',
        },
      },
      {
        onSuccess: () => {
          setIsModalOpen(false);
          setItemName('');
          refetch();
        },
      }
    );
  };

  const handleGeneratePo = (vendor: string, groupItems: RestockItem[]) => {
    const po = assemblePurchaseOrder(vendor, groupItems, '우리 매장', 1);
    setActivePo(po);
  };

  const handleShareOrCopy = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '소모품 발주서',
          text,
        });
        return;
      } catch (err) {
        // 사용자가 취소했거나 미지원 시 클립보드 복사로 fallback
      }
    }
    await navigator.clipboard.writeText(text);
    alert('발주서 내용이 클립보드에 복사되었습니다! 카카오톡이나 문자로 붙여넣어 전송하세요.');
  };

  if (isLoading) {
    return <div className="p-6 text-gray-500">소모품 재고 및 발주 목록을 불러오는 중...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">소모품 안전재고 및 간이 발주서</h1>
          <p className="text-sm text-gray-500 mt-1">
            최소 안전재고 이하로 떨어진 소모품을 감지하여 거래처별 원터치 발주서(카카오톡/문자)를 자동 생성합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm shadow-sm transition"
        >
          + 새 소모품 항목 등록
        </button>
      </div>

      {/* 발주 권고 알림 배너 */}
      {neededItems.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-amber-800">
              ⚠️ 안전재고 미달 품목이 {neededItems.length}건 발견되었습니다!
            </h4>
            <p className="text-xs text-amber-700 mt-0.5">
              공급처별 원터치 발주서를 생성하여 즉시 거래처에 발송할 수 있습니다.
            </p>
          </div>
          <div className="flex gap-2">
            {Object.entries(vendorGroups).map(([vendor, gItems]) => (
              <button
                key={vendor}
                onClick={() => handleGeneratePo(vendor, gItems)}
                className="px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition"
              >
                📝 [{vendor}] 발주서 생성 ({gItems.length}종)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 소모품 목록 테이블 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
            <tr>
              <th className="p-3">품목명</th>
              <th className="p-3">분류</th>
              <th className="p-3">현재 재고</th>
              <th className="p-3">최소 안전재고</th>
              <th className="p-3">권장 발주량</th>
              <th className="p-3">공급처</th>
              <th className="p-3">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  등록된 소모품이 없습니다.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isShortage = item.currentQuantity <= item.safetyThreshold;
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-bold text-gray-900">{item.itemName}</td>
                    <td className="p-3 text-gray-500">{item.category}</td>
                    <td className="p-3 font-semibold text-gray-900">
                      {item.currentQuantity} {item.unit}
                    </td>
                    <td className="p-3 text-gray-500">
                      {item.safetyThreshold} {item.unit}
                    </td>
                    <td className="p-3 text-indigo-600 font-medium">
                      +{item.optimalOrderQuantity} {item.unit}
                    </td>
                    <td className="p-3 text-gray-700">{item.vendorName}</td>
                    <td className="p-3">
                      {isShortage ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200 text-[10px]">
                          발주 필요
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px]">
                          양호
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 발주서 생성 모달 */}
      {activePo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-900">
                원터치 간이 발주서 ({activePo.vendorName})
              </h3>
              <button onClick={() => setActivePo(null)} className="text-gray-400 hover:text-gray-600 text-sm font-bold">
                ✕
              </button>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs font-mono whitespace-pre-wrap text-gray-800 leading-relaxed max-h-[300px] overflow-y-auto">
              {activePo.orderSummaryText}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActivePo(null)}
                className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 text-xs font-medium"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => handleShareOrCopy(activePo.orderSummaryText)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-semibold"
              >
                📋 카카오톡/문자 전송 (복사 및 공유)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 신규 등록 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">새 소모품/비품 등록</h3>
            <form onSubmit={handleCreateItem} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">품목명</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="예: A4 복사용지 80g"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">현재 재고</label>
                  <input
                    type="number"
                    min={0}
                    value={currentQty}
                    onChange={(e) => setCurrentQty(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">최소 안전재고</label>
                  <input
                    type="number"
                    min={1}
                    value={safetyThreshold}
                    onChange={(e) => setSafetyThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">권장 발주량</label>
                  <input
                    type="number"
                    min={1}
                    value={orderQty}
                    onChange={(e) => setOrderQty(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">단위</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="BOX, EA, KG 등"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">단가 (원)</label>
                  <input
                    type="number"
                    value={unitCost}
                    onChange={(e) => setUnitCost(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">공급처명</label>
                  <input
                    type="text"
                    required
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="예: 대한오피스"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">공급처 연락처</label>
                  <input
                    type="text"
                    value={vendorContact}
                    onChange={(e) => setVendorContact(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                >
                  등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
