import React, { useState, useEffect, useMemo } from 'react';
import {
  Workflow,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  PauseCircle,
  PlayCircle,
  X,
  Search,
  Filter,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  transitionTaskPipelineStage,
  evaluateStageSla,
  type PipelineStage,
  type TaskOrder,
} from '../domain/taskPipelineEngine';

const STORAGE_KEY_PIPELINES = 'moa_task_pipeline_orders';

const KANBAN_STAGES: { stage: PipelineStage; label: string; color: string }[] = [
  { stage: 'RECEIVED', label: '의뢰 접수', color: 'border-slate-300 bg-slate-50/50' },
  { stage: 'IN_PROGRESS', label: '작업 진행 중', color: 'border-blue-200 bg-blue-50/20' },
  { stage: 'INSPECTION', label: '품질 검수', color: 'border-amber-200 bg-amber-50/20' },
  { stage: 'READY_FOR_PICKUP', label: '출고·픽업 대기', color: 'border-emerald-200 bg-emerald-50/20' },
  { stage: 'COMPLETED', label: '최종 완료', color: 'border-purple-200 bg-purple-50/20' },
];

const INITIAL_SAMPLE_ORDERS: TaskOrder[] = [
  {
    id: 'ord-101',
    orderNumber: 'RO-2026-0101',
    title: '빈티지 가죽 가방 지퍼 수선 및 가죽 영양 케어',
    customerId: 'cust-김민수',
    currentStage: 'IN_PROGRESS',
    stageEnteredAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    slaHoursPerStage: { IN_PROGRESS: 24 },
  },
  {
    id: 'ord-102',
    orderNumber: 'RO-2026-0102',
    title: '프리미엄 자전거 브레이크 패드 교체 및 디레일러 세팅',
    customerId: 'cust-이영희',
    currentStage: 'RECEIVED',
    stageEnteredAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(), // 24시간 초과 (SLA 지연)
    slaHoursPerStage: { RECEIVED: 24 },
  },
  {
    id: 'ord-103',
    orderNumber: 'RO-2026-0103',
    title: '디테일링 손세차 및 전면 유리 유막 제거',
    customerId: 'cust-박지훈',
    currentStage: 'INSPECTION',
    stageEnteredAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    slaHoursPerStage: { INSPECTION: 4 },
  },
];

export const TaskPipelineKanbanView: React.FC = () => {
  const [orders, setOrders] = useState<TaskOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PIPELINES);
      if (saved) {
        setOrders(JSON.parse(saved));
      } else {
        setOrders(INITIAL_SAMPLE_ORDERS);
        localStorage.setItem(STORAGE_KEY_PIPELINES, JSON.stringify(INITIAL_SAMPLE_ORDERS));
      }
    } catch {
      setOrders(INITIAL_SAMPLE_ORDERS);
    }
  }, []);

  const saveOrders = (next: TaskOrder[]) => {
    setOrders(next);
    try {
      localStorage.setItem(STORAGE_KEY_PIPELINES, JSON.stringify(next));
    } catch {
      // 무시
    }
  };

  const handleStageTransition = (order: TaskOrder, targetStage: PipelineStage) => {
    const res = transitionTaskPipelineStage(order, targetStage);
    if (!res.success) {
      showToast(res.error || '단계 이동에 실패했습니다.', 'warning');
      return;
    }

    const next = orders.map((o) => (o.id === order.id ? res.updatedOrder : o));
    saveOrders(next);
    showToast(`'${order.orderNumber}' 작업이 [${targetStage}] 단계로 이동했습니다.`, 'success');
  };

  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders;
    const term = searchTerm.toLowerCase();
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(term) ||
        o.title.toLowerCase().includes(term) ||
        o.customerId.toLowerCase().includes(term)
    );
  }, [orders, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-2 pb-12">
      {/* 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold mb-1.5">
            <Workflow className="w-3.5 h-3.5" />
            <span>단계별 작업 공정 관리</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">작업 파이프라인 (칸반 보드)</h1>
          <p className="text-xs text-slate-500 mt-1">
            자동차 정비, 가죽·도예 공방, 세탁·수선, 튜닝 등 수리·주문 제작 공정을 실시간 추적합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>신규 작업 주문 접수</span>
        </button>
      </div>

      {/* 검색 바 */}
      <div className="flex items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="주문 번호, 의뢰 품목, 고객명 검색"
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-semibold">
          전체 <span className="text-blue-600 font-bold">{orders.length}</span>건 진행 중
        </div>
      </div>

      {/* 칸반 5단 컬럼 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
        {KANBAN_STAGES.map((col) => {
          const colOrders = filteredOrders.filter((o) => o.currentStage === col.stage);
          return (
            <div
              key={col.stage}
              className={`rounded-2xl border ${col.color} p-3.5 min-h-[480px] flex flex-col space-y-3 bg-white/70 shadow-xs`}
            >
              {/* 컬럼 헤더 */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="text-xs font-extrabold text-slate-800">{col.label}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-[11px] font-bold">
                  {colOrders.length}
                </span>
              </div>

              {/* 주문 카드 목록 */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-0.5">
                {colOrders.length === 0 ? (
                  <div className="py-12 text-center text-[11px] text-slate-400">
                    진행 건 없음
                  </div>
                ) : (
                  colOrders.map((order) => {
                    // SLA 지연 평가
                    const slaHours = order.slaHoursPerStage?.[col.stage] || 24;
                    const sla = evaluateStageSla({
                      stageEnteredAt: order.stageEnteredAt,
                      slaHours,
                      currentTime: new Date().toISOString(),
                    });

                    return (
                      <div
                        key={order.id}
                        className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2.5 shadow-xs hover:shadow-md transition-shadow"
                      >
                        {/* 주문 번호 & SLA 배지 */}
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[11px] font-bold text-slate-500">
                            {order.orderNumber}
                          </span>
                          {col.stage !== 'COMPLETED' && (
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                sla.isBreached
                                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              <Clock className="w-2.5 h-2.5" />
                              {sla.isBreached
                                ? `지연 (${Math.abs(sla.remainingHours)}h 초과)`
                                : `${sla.remainingHours}h 남음`}
                            </span>
                          )}
                        </div>

                        {/* 작업명 */}
                        <p className="text-xs font-bold text-slate-900 leading-snug">
                          {order.title}
                        </p>

                        {/* 고객 정보 */}
                        <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                          <span>{order.customerId.replace('cust-', '')}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(order.stageEnteredAt).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* 단계 전이 액션 버튼들 */}
                        <div className="flex items-center justify-between gap-1 pt-1">
                          {/* 검수 불합격 시 재작업 되돌림 */}
                          {col.stage === 'INSPECTION' && (
                            <button
                              type="button"
                              onClick={() => handleStageTransition(order, 'IN_PROGRESS')}
                              className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center gap-0.5"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              재작업
                            </button>
                          )}

                          {/* 순차 진행 버튼 */}
                          {col.stage === 'RECEIVED' && (
                            <button
                              type="button"
                              onClick={() => handleStageTransition(order, 'IN_PROGRESS')}
                              className="w-full py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center gap-1"
                            >
                              <span>작업 착수</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}

                          {col.stage === 'IN_PROGRESS' && (
                            <button
                              type="button"
                              onClick={() => handleStageTransition(order, 'INSPECTION')}
                              className="w-full py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold flex items-center justify-center gap-1"
                            >
                              <span>검수 요청</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}

                          {col.stage === 'INSPECTION' && (
                            <button
                              type="button"
                              onClick={() => handleStageTransition(order, 'READY_FOR_PICKUP')}
                              className="flex-1 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold flex items-center justify-center gap-1"
                            >
                              <span>합격·준비완료</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}

                          {col.stage === 'READY_FOR_PICKUP' && (
                            <button
                              type="button"
                              onClick={() => handleStageTransition(order, 'COMPLETED')}
                              className="w-full py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold flex items-center justify-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>고객 인도 완료</span>
                            </button>
                          )}

                          {col.stage === 'COMPLETED' && (
                            <span className="w-full text-center py-1 text-[11px] font-bold text-slate-400">
                              공정 마감
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 신규 작업 접수 모달 */}
      {isNewModalOpen && (
        <NewTaskOrderModal
          onClose={() => setIsNewModalOpen(false)}
          onCreated={(newOrder) => {
            saveOrders([newOrder, ...orders]);
            setIsNewModalOpen(false);
            showToast(`신규 작업 '${newOrder.orderNumber}'이 접수되었습니다.`, 'success');
          }}
        />
      )}
    </div>
  );
};

interface NewModalProps {
  onClose: () => void;
  onCreated: (order: TaskOrder) => void;
}

const NewTaskOrderModal: React.FC<NewModalProps> = ({ onClose, onCreated }) => {
  const [customerName, setCustomerName] = useState('');
  const [title, setTitle] = useState('');
  const [slaHours, setSlaHours] = useState('24');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !customerName.trim()) {
      showToast('작업 품목명과 고객명을 입력해주세요.', 'warning');
      return;
    }

    const orderNumber = `RO-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    const newOrder: TaskOrder = {
      id: `ord-${Date.now()}`,
      orderNumber,
      title: title.trim(),
      customerId: `cust-${customerName.trim()}`,
      currentStage: 'RECEIVED',
      stageEnteredAt: new Date().toISOString(),
      slaHoursPerStage: {
        RECEIVED: Number(slaHours) || 24,
        IN_PROGRESS: Number(slaHours) || 24,
      },
    };

    onCreated(newOrder);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-extrabold text-slate-900">신규 작업 의뢰 접수</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">고객명</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="예: 김민수"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">의뢰 작업 및 품목명</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 엔진오일 교환 및 하부 점검 / 가죽 재킷 수선"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">기본 목표 완료 시간 (SLA)</label>
            <select
              value={slaHours}
              onChange={(e) => setSlaHours(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="4">4시간 이내 (당일 특급)</option>
              <option value="12">12시간 이내</option>
              <option value="24">24시간 이내 (1일)</option>
              <option value="48">48시간 이내 (2일)</option>
              <option value="72">72시간 이내 (3일)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
            >
              접수 및 칸반 등록
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
