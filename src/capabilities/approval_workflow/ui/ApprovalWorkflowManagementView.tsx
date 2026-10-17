import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import {
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Filter,
  Search,
  ChevronRight,
  UserCheck,
  FileText,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  summarizeApprovalMetrics,
  type ApprovalRequest,
  type ApprovalStatus,
} from '../domain/approvalEngine';

export const ApprovalWorkflowManagementView: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);

  // 1. Refine useList로 approval_requests 데이터 페칭
  const { query } = useList<ApprovalRequest>({
    resource: 'approval_requests',
    sorters: [{ field: 'created_at', order: 'desc' }],
    pagination: { pageSize: 50 },
  });

  const requests = query?.data?.data || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  // 2. Refine useCreate / useUpdate
  const { mutate: createRequest } = useCreate();
  const { mutate: updateRequest } = useUpdate();

  // 신규 기안 폼 상태
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState<number>(0);
  const [newDescription, setNewDescription] = useState('');

  const metrics = summarizeApprovalMetrics(requests);

  const filteredRequests = requests.filter((r) => {
    if (selectedStatus !== 'ALL' && r.status !== selectedStatus) return false;
    if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    createRequest(
      {
        resource: 'approval_requests',
        values: {
          title: newTitle,
          content: { amount: newAmount, description: newDescription },
          status: 'pending',
          current_step_order: 1,
          total_steps: 2,
          requester_name: '현재 기안자',
        },
      },
      {
        onSuccess: () => {
          showToast('전자결재 문서가 기안되었습니다.', 'success');
          setIsNewModalOpen(false);
          setNewTitle('');
          setNewAmount(0);
          setNewDescription('');
          refetch();
        },
      }
    );
  };

  const handleApprove = (req: ApprovalRequest) => {
    updateRequest(
      {
        resource: 'approval_requests',
        id: req.id,
        values: {
          status: 'approved',
          final_approved_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          showToast('승인 처리되었습니다.', 'success');
          setSelectedRequest(null);
          refetch();
        },
      }
    );
  };

  const handleReject = (req: ApprovalRequest) => {
    updateRequest(
      {
        resource: 'approval_requests',
        id: req.id,
        values: {
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: '반려 처리되었습니다.',
        },
      },
      {
        onSuccess: () => {
          showToast('반려 처리되었습니다.', 'warning');
          setSelectedRequest(null);
          refetch();
        },
      }
    );
  };

  if (isLoading) {
    return <div className="p-6 text-slate-500">전자결재 문서를 불러오는 중...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <FileCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">전사 전자결재함</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            부서별 지출 품의, 구매 요청, 근태 및 작업 승인 문서를 다단계 결재선으로 심사·승인합니다.
          </p>
        </div>
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>신규 결재 기안</span>
        </button>
      </div>

      {/* KPI 메트릭스 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>총 기안 문서</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{metrics.totalCount}건</div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-amber-600 text-xs font-semibold uppercase">
            <span>결재 대기</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2">{metrics.pendingCount}건</div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 text-xs font-semibold uppercase">
            <span>승인 완료</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{metrics.approvedCount}건</div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-rose-600 text-xs font-semibold uppercase">
            <span>반려 문서</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-2">{metrics.rejectedCount}건</div>
        </div>
      </div>

      {/* 필터 및 검색 바 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'pending', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedStatus === status
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status === 'ALL' && '전체'}
              {status === 'pending' && '결재 대기'}
              {status === 'approved' && '승인 완료'}
              {status === 'rejected' && '반려'}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="기안 제목 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* 문서 목록 테이블 */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">기안 문서 제목</th>
                <th className="py-3 px-4">기안자</th>
                <th className="py-3 px-4">진행 단계</th>
                <th className="py-3 px-4">상태</th>
                <th className="py-3 px-4">기안일</th>
                <th className="py-3 px-4 text-right">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    등록된 전자결재 문서가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-900">{req.title}</td>
                    <td className="py-3.5 px-4">{req.requesterName || '직원'}</td>
                    <td className="py-3.5 px-4">
                      {req.currentStepOrder} / {req.totalSteps}단계
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          req.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : req.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {req.status === 'approved' && '승인'}
                        {req.status === 'rejected' && '반려'}
                        {req.status === 'pending' && '심사 중'}
                        {req.status === 'draft' && '임시 저장'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {req.createdAt ? req.createdAt.slice(0, 10) : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {req.status === 'pending' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApprove(req)}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-semibold"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => handleReject(req)}
                            className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-xs font-semibold"
                          >
                            반려
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 신규 기안 모달 */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">신규 전자결재 기안</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  기안 제목 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 3분기 사무용품 및 비품 구매 품의서"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  품의 금액 (원)
                </label>
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  기안 상세 내용 및 품의 사유
                </label>
                <textarea
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="기안의 구체적인 목적 및 예상 집행 내역을 기록하십시오."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                >
                  상신 (결재 요청)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
