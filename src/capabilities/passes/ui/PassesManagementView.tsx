import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Ticket,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Sparkles,
  X,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  fetchPasses,
  deductPassAtomic,
  issuePass,
  type PassRecord,
} from '../services/passesService';
import type { PassType } from '../domain/passesEngine';
import { invalidateTenantQueries } from '@/core/query/tenantQueryKeys';
import { notifyStorageFromRefineResource } from '@/core/query/crossCacheBridge';

// ─────────────────────────────────────────────────────────────────────────────
// 상태 배지
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PassRecord['status'] }) {
  switch (status) {
    case 'ACTIVE':
      return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">이용 가능</span>;
    case 'EXHAUSTED':
      return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">소진됨</span>;
    case 'EXPIRED':
      return <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">기간 만료</span>;
    case 'PAUSED':
      return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">일시 정지</span>;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 발급 모달
// ─────────────────────────────────────────────────────────────────────────────

interface IssueModalProps {
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string) => void;
}

function IssuePassModal({ tenantId, onClose, onSuccess, showToast }: IssueModalProps) {
  const [passName, setPassName] = useState('10회 수강권');
  const [passType, setPassType] = useState<PassType>('COUNT_BASED');
  const [totalCount, setTotalCount] = useState(10);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [validityDays, setValidityDays] = useState(90);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      showToast('회원 이름을 입력해 주세요.');
      return;
    }
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      await issuePass({
        tenantId,
        customerName,
        customerPhone,
        passName,
        passType,
        totalCount,
        validityDays,
      });
      showToast('이용권이 정상 발급되었습니다!');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '발급 실패');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-slate-900">신규 이용권 발급</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700">회원 이름 *</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="예: 홍길동"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">휴대폰 번호</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">이용권 명칭 *</label>
            <input
              type="text"
              required
              value={passName}
              onChange={(e) => setPassName(e.target.value)}
              placeholder="예: 필라테스 10회권, 1개월 자유권"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700">제공 횟수</label>
              <input
                type="number"
                min="1"
                value={totalCount}
                onChange={(e) => setTotalCount(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">유효기간 (일)</label>
              <input
                type="number"
                min="1"
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-5 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? '발급 중...' : '발급 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 뷰
// ─────────────────────────────────────────────────────────────────────────────

export const PassesManagementView: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const [passes, setPasses] = useState<PassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  // 입장(-1) 버튼 중복 제출 방지: passId → 처리 중 여부
  const [deductingIds, setDeductingIds] = useState<Set<string>>(new Set());
  const deductingIdsRef = useRef<Set<string>>(new Set());

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  // ── 목록 조회 (AbortController로 언마운트 경쟁 조건 방지) ─────────────────
  const loadPasses = useCallback(
    async (signal?: AbortSignal) => {
      if (!currentOrganization) return;
      setLoading(true);
      try {
        const result = await fetchPasses(currentOrganization.id, signal);
        // signal이 중단된 경우 상태 업데이트 건너뜀
        if (signal?.aborted) return;
        setPasses(result);
      } catch (err) {
        if (signal?.aborted) return;
        // 목록 조회 실패는 크래시 방지 처리 (기존 passes 유지)
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [currentOrganization]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadPasses(controller.signal);
    return () => controller.abort();
  }, [loadPasses]);

  // ── 입장 -1 차감 ──────────────────────────────────────────────────────────
  const handleDeductPass = useCallback(
    async (pass: PassRecord) => {
      if (pass.status !== 'ACTIVE' || pass.remaining_count <= 0) {
        showToast('차감할 수 없는 이용권입니다.');
        return;
      }
      // 동기식 중복 클릭 방지
      if (deductingIdsRef.current.has(pass.id)) return;
      deductingIdsRef.current.add(pass.id);

      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);

      // 낙관적 UI 업데이트
      const nextCount = Math.max(0, pass.remaining_count - 1);
      const nextStatus: PassRecord['status'] =
        nextCount === 0 && pass.pass_type !== 'PERIOD_BASED' ? 'EXHAUSTED' : 'ACTIVE';

      setPasses((prev) =>
        prev.map((item) =>
          item.id === pass.id
            ? { ...item, remaining_count: nextCount, status: nextStatus }
            : item
        )
      );
      setDeductingIds((prev) => new Set(prev).add(pass.id));

      try {
        await deductPassAtomic(pass.id);
        if (currentOrganization?.id) {
          invalidateTenantQueries('passes', currentOrganization.id);
        }
        notifyStorageFromRefineResource('passes');
        showToast(`[${pass.customer_name || '회원'}] 입장 완료! (잔여 ${nextCount}회)`);
      } catch (err) {
        // 서버 실패 시 롤백
        setPasses((prev) =>
          prev.map((item) =>
            item.id === pass.id
              ? { ...item, remaining_count: pass.remaining_count, status: pass.status }
              : item
          )
        );
        showToast(err instanceof Error ? err.message : '이용권 차감에 실패했습니다.');
      } finally {
        deductingIdsRef.current.delete(pass.id);
        setDeductingIds((prev) => {
          const next = new Set(prev);
          next.delete(pass.id);
          return next;
        });
      }
    },
    [showToast]
  );

  // ── 필터링 ────────────────────────────────────────────────────────────────
  const filteredPasses = useMemo(() => {
    return passes.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (p.customer_name ?? '').toLowerCase().includes(q) ||
        p.pass_name.toLowerCase().includes(q) ||
        (p.customer_phone ?? '').replace(/-/g, '').includes(q)
      );
    });
  }, [passes, searchQuery, statusFilter]);

  const tenantId = currentOrganization?.id ?? '';

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900/90 px-4 py-2.5 text-xs font-semibold text-white shadow-xl backdrop-blur transition-all">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-600">
            <Ticket className="h-6 w-6" />
            <h1 className="text-xl font-black text-slate-900 sm:text-2xl">이용권·회원권 관리</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            회원별 잔여 횟수를 실시간으로 확인하고 터치 한 번으로 입장을 처리합니다.
          </p>
        </div>

        <button
          onClick={() => setIsIssueModalOpen(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          신규 이용권 발급
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="회원명, 이용권 이름, 전화번호 4자리 검색..."
            className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="ALL">전체 상태</option>
            <option value="ACTIVE">이용 가능</option>
            <option value="EXHAUSTED">소진됨</option>
            <option value="EXPIRED">기간 만료</option>
            <option value="PAUSED">일시 정지</option>
          </select>
        </div>
      </div>

      {/* Passes List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <p className="mt-2 text-xs text-slate-500">이용권 목록을 불러오는 중...</p>
          </div>
        ) : filteredPasses.length === 0 ? (
          <div className="p-12 text-center">
            <Ticket className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">발급된 이용권이 없습니다</p>
            <p className="mt-1 text-xs text-slate-400">우측 상단 버튼을 눌러 새 이용권을 발급하세요.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredPasses.map((pass) => {
              const isDeducting = deductingIds.has(pass.id);
              const canDeduct = pass.status === 'ACTIVE' && pass.remaining_count > 0;

              return (
                <div
                  key={pass.id}
                  className="flex flex-col gap-4 p-4 transition hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Left Info */}
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">
                          {pass.customer_name || '회원'}
                        </span>
                        {pass.customer_phone && (
                          <span className="text-xs font-medium text-slate-400">
                            ({pass.customer_phone.slice(-4)})
                          </span>
                        )}
                        <StatusBadge status={pass.status} />
                      </div>
                      <div className="mt-1 text-xs font-bold text-slate-700">{pass.pass_name}</div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
                        <span>만료일: {pass.expires_at}</span>
                        <span>전체 {pass.total_count}회</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Action */}
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">잔여 횟수</div>
                      <div className="text-xl font-black text-indigo-600">
                        {pass.remaining_count}{' '}
                        <span className="text-xs font-normal text-slate-500">
                          / {pass.total_count}회
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeductPass(pass)}
                      disabled={!canDeduct || isDeducting}
                      aria-label={`${pass.customer_name || '회원'} 입장 처리 (-1회)`}
                      className="inline-flex h-12 min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {isDeducting ? '처리 중...' : '입장 -1'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 발급 모달 */}
      {isIssueModalOpen && tenantId && (
        <IssuePassModal
          tenantId={tenantId}
          onClose={() => setIsIssueModalOpen(false)}
          onSuccess={() => {
            if (currentOrganization?.id) {
              invalidateTenantQueries('passes', currentOrganization.id);
            }
            notifyStorageFromRefineResource('passes');
            void loadPasses();
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
};
