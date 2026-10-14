import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  Layers,
  ArrowRight,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Car,
  ChevronRight,
  DollarSign,
  PackageCheck,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  calculateWorkOrderInvoice,
  advanceWorkOrderStage,
  summarizeWorkOrderKanban,
  type WorkOrderItem,
  type WorkOrderStage,
} from '../domain/workOrderKanbanEngine';

const STORAGE_KEY_WORK_ORDERS = 'moa_work_order_kanban_data';

const DEFAULT_ORDERS: WorkOrderItem[] = [
  {
    id: 'wo-1',
    orderNumber: 'WO-202610-001',
    targetItemName: '제네시스 G80 3.5T (12가 3456)',
    customerName: '홍길동',
    customerPhone: '010-8832-1920',
    stage: 'IN_PROGRESS',
    assignedMechanic: '김정비 팀장',
    diagnosis: '전륜 브레이크 패드 마모 및 100% 합성 엔진오일 교환',
    laborFee: 120000,
    parts: [
      { id: 'p-1', partName: '전륜 세라믹 브레이크 패드 세트', quantity: 1, unitPrice: 140000 },
      { id: 'p-2', partName: '모빌원 합성 엔진오일 6L', quantity: 1, unitPrice: 90000 },
    ],
    createdAt: '2026-10-14T09:30:00Z',
  },
  {
    id: 'wo-2',
    orderNumber: 'WO-202610-002',
    targetItemName: 'BMW 520d (34너 7890)',
    customerName: '이서진',
    customerPhone: '010-4491-2281',
    stage: 'PARTS_WAITING',
    assignedMechanic: '박미캐닉',
    diagnosis: '에어컨 컴프레서 소음 및 가스 냉매 누설',
    laborFee: 180000,
    parts: [
      { id: 'p-3', partName: '정품 에어컨 컴프레서 모듈', quantity: 1, unitPrice: 420000 },
    ],
    createdAt: '2026-10-14T10:15:00Z',
  },
  {
    id: 'wo-3',
    orderNumber: 'WO-202610-003',
    targetItemName: '아반떼 CN7 (56다 1122)',
    customerName: '김민수',
    customerPhone: '010-3321-9988',
    stage: 'INSPECTION',
    assignedMechanic: '강반장',
    diagnosis: '점화 플러그 및 코일 풀세트 교체',
    laborFee: 80000,
    parts: [
      { id: 'p-4', partName: '이리듐 점화플러그 4개', quantity: 4, unitPrice: 15000 },
    ],
    createdAt: '2026-10-14T11:00:00Z',
  },
  {
    id: 'wo-4',
    orderNumber: 'WO-202610-004',
    targetItemName: '벤츠 E300 (78라 9900)',
    customerName: '최유진',
    customerPhone: '010-7788-5544',
    stage: 'RECEIVED',
    assignedMechanic: '김정비 팀장',
    diagnosis: '계기판 엔진 경고등 점등 정밀 스캐너 진단',
    laborFee: 50000,
    parts: [],
    createdAt: '2026-10-14T13:00:00Z',
  },
];

const STAGE_COLUMNS: { stage: WorkOrderStage; label: string; color: string }[] = [
  { stage: 'RECEIVED', label: '1. 입고 / 진단', color: 'border-slate-400 bg-slate-50' },
  { stage: 'PARTS_WAITING', label: '2. 부품·자재 대기', color: 'border-amber-400 bg-amber-50' },
  { stage: 'IN_PROGRESS', label: '3. 정비·작업 중', color: 'border-blue-400 bg-blue-50' },
  { stage: 'INSPECTION', label: '4. 검수 / 시운전', color: 'border-purple-400 bg-purple-50' },
  { stage: 'COMPLETED', label: '5. 완료 / 출고 대기', color: 'border-emerald-400 bg-emerald-50' },
];

export const WorkOrderKanbanView: React.FC = () => {
  const [orders, setOrders] = useState<WorkOrderItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WORK_ORDERS);
      return saved ? JSON.parse(saved) : DEFAULT_ORDERS;
    } catch {
      return DEFAULT_ORDERS;
    }
  });

  const [selectedOrder, setSelectedOrder] = useState<WorkOrderItem | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_WORK_ORDERS, JSON.stringify(orders));
    } catch {}
  }, [orders]);

  const summary = useMemo(() => summarizeWorkOrderKanban(orders), [orders]);

  const handleAdvance = (order: WorkOrderItem) => {
    const stageFlow: WorkOrderStage[] = [
      'RECEIVED',
      'PARTS_WAITING',
      'IN_PROGRESS',
      'INSPECTION',
      'COMPLETED',
    ];
    const currentIndex = stageFlow.indexOf(order.stage);
    if (currentIndex < stageFlow.length - 1) {
      const nextStage = stageFlow[currentIndex + 1];
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? advanceWorkOrderStage(o, nextStage) : o))
      );
      showToast(`[${order.orderNumber}] ${nextStage} 단계로 이동했습니다.`, 'info');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-slate-900 text-white rounded-lg">
              <Wrench className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900">
              정비·수리 단계별 작업지시서 & 부품 공임 견적서
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            차량·물품 입고부터 부품 대기, 정비, 검수, 출고까지 5단계 칸반 공정을 추적하고 투명한 공임 견적서를 발행합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => showToast('신규 작업지시서 입고 등록이 열립니다.', 'info')}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            작업지시서 입고
          </button>
        </div>
      </div>

      {/* 상단 공정 메트릭 요약 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-400 font-medium block">총 입고/진단</span>
          <div className="text-xl font-bold text-gray-900 mt-0.5">{summary.receivedCount}건</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm">
          <span className="text-xs text-amber-700 font-medium block">부품 수급 대기</span>
          <div className="text-xl font-bold text-amber-700 mt-0.5">
            {summary.partsWaitingCount}건
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/30 shadow-sm">
          <span className="text-xs text-blue-700 font-medium block">정비 리프트 작업중</span>
          <div className="text-xl font-bold text-blue-700 mt-0.5">{summary.inProgressCount}건</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-purple-200 bg-purple-50/30 shadow-sm">
          <span className="text-xs text-purple-700 font-medium block">최종 검수/시운전</span>
          <div className="text-xl font-bold text-purple-700 mt-0.5">
            {summary.inspectionCount}건
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
          <span className="text-xs text-emerald-700 font-medium block">출고 완료/대기</span>
          <div className="text-xl font-bold text-emerald-700 mt-0.5">{summary.completedCount}건</div>
        </div>
      </div>

      {/* 5열 칸반 보드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {STAGE_COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.stage === col.stage);
          return (
            <div
              key={col.stage}
              className={`rounded-xl border p-3 flex flex-col justify-between min-h-[500px] ${col.color}`}
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 mb-3">
                  <span className="font-bold text-xs text-gray-800">{col.label}</span>
                  <span className="text-xs font-bold px-1.5 py-0.5 bg-white rounded border text-gray-700">
                    {colOrders.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {colOrders.map((order) => {
                    const invoice = calculateWorkOrderInvoice(order);
                    return (
                      <div
                        key={order.id}
                        className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-xs space-y-2.5 hover:border-slate-400 transition"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-gray-400">
                              {order.orderNumber}
                            </span>
                            <span className="text-xs font-semibold text-gray-900">
                              {order.assignedMechanic}
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-gray-900 mt-1 line-clamp-1">
                            {order.targetItemName}
                          </h4>
                          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                            {order.diagnosis}
                          </p>
                        </div>

                        {/* 부품 및 공임 합산 */}
                        <div className="pt-2 border-t text-[11px] flex items-center justify-between text-gray-600">
                          <span>견적(VAT포함)</span>
                          <span className="font-bold text-slate-900">
                            {invoice.grandTotal.toLocaleString()}원
                          </span>
                        </div>

                        {/* 액션 버튼 */}
                        <div className="pt-1 flex items-center justify-between gap-1">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-2 py-1 text-[11px] font-medium text-gray-600 border rounded hover:bg-gray-50"
                          >
                            견적서 상세
                          </button>
                          {col.stage !== 'COMPLETED' && (
                            <button
                              onClick={() => handleAdvance(order)}
                              className="px-2 py-1 text-[11px] font-bold text-white bg-slate-900 rounded hover:bg-slate-800 flex items-center gap-0.5"
                            >
                              <span>다음</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 부품 공임 상세 견적서 팝업 모달 */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-xs font-mono text-gray-400">
                  {selectedOrder.orderNumber}
                </span>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedOrder.targetItemName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded-lg">
              <div>고객: {selectedOrder.customerName} ({selectedOrder.customerPhone})</div>
              <div>담당 기사: {selectedOrder.assignedMechanic}</div>
              <div>고장 진단: {selectedOrder.diagnosis}</div>
            </div>

            {/* 투입 부품 목록 */}
            <div>
              <h4 className="text-xs font-bold text-gray-800 mb-2">투입 부품 명세</h4>
              {selectedOrder.parts.length === 0 ? (
                <p className="text-xs text-gray-400">투입 부품 없음 (단순 진단/점검 공임)</p>
              ) : (
                <div className="border rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 border-b">
                      <tr>
                        <th className="py-1.5 px-3">부품명</th>
                        <th className="py-1.5 px-3 text-right">수량</th>
                        <th className="py-1.5 px-3 text-right">단가</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedOrder.parts.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2 px-3 font-medium text-gray-900">{p.partName}</td>
                          <td className="py-2 px-3 text-right text-gray-700">{p.quantity}</td>
                          <td className="py-2 px-3 text-right font-semibold text-gray-900">
                            {(p.quantity * p.unitPrice).toLocaleString()}원
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 최종 견적서 계산 */}
            {(() => {
              const inv = calculateWorkOrderInvoice(selectedOrder);
              return (
                <div className="space-y-1.5 text-xs border-t pt-3">
                  <div className="flex justify-between text-gray-600">
                    <span>부품비 합계</span>
                    <span>{inv.totalPartsFee.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>기술 공임비</span>
                    <span>{inv.laborFee.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>공급가액</span>
                    <span className="font-semibold">{inv.subtotal.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>부가가치세 (10%)</span>
                    <span>{inv.vat.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-slate-900 border-t pt-2 mt-1">
                    <span>최종 정산 청구액</span>
                    <span className="text-lg font-black text-slate-900">
                      {inv.grandTotal.toLocaleString()}원
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  showToast(
                    `[${selectedOrder.orderNumber}] 정비·수리 견적서 발행 및 출력이 완료되었습니다.`,
                    'success'
                  );
                  setSelectedOrder(null);
                }}
                className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition"
              >
                공식 정비 견적서 발행
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
