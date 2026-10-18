import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { HelpCircle, Plus, ShieldCheck, Key, Lock, CheckCircle2, MessageSquare } from 'lucide-react';
import {
  generateTicketCode,
  hashAccessPin,
  verifyAccessPin,
  validateGrievanceSubmission,
  type AnonymousGrievanceRecord,
  type GrievanceCategory,
} from '../domain/grievanceEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

export const GrievanceListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState<GrievanceCategory>('WORKPLACE_HARASSMENT');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pin, setPin] = useState('');

  // 답변 작성 모달 상태
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<AnonymousGrievanceRecord | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  const { query } = useList<AnonymousGrievanceRecord>({
    resource: 'anonymous_grievances',
    sorters: [{ field: 'submitted_at', order: 'desc' }],
    pagination: { pageSize: 20 },
  });

  const records = (query?.data?.data as AnonymousGrievanceRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createRecord } = useCreate();
  const { mutate: updateRecord } = useUpdate();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateGrievanceSubmission(title, content, pin);
    if (!val.isValid) {
      showToast(val.error || '입력 오류', 'error');
      return;
    }

    const ticketCode = generateTicketCode(records.length + 1);
    const pinHash = hashAccessPin(pin.trim());

    createRecord(
      {
        resource: 'anonymous_grievances',
        values: {
          ticket_code: ticketCode,
          access_pin_hash: pinHash,
          category,
          subject_title: title.trim(),
          incident_content: content.trim(),
          evidence_attached: false,
          status: 'SUBMITTED',
          submitted_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          showToast(`익명 제보가 접수되었습니다. (접수코드: ${ticketCode})`, 'success');
          setIsModalOpen(false);
          setTitle('');
          setContent('');
          setPin('');
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '접수 실패', 'error');
        },
      }
    );
  };

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !feedbackText.trim()) return;

    updateRecord(
      {
        resource: 'anonymous_grievances',
        id: selectedTicket.id,
        values: {
          status: 'RESOLVED',
          investigation_feedback: feedbackText.trim(),
          resolved_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          showToast(`[${selectedTicket.ticket_code}] 조치 회신이 등록되었습니다.`, 'success');
          setReplyModalOpen(false);
          setSelectedTicket(null);
          setFeedbackText('');
          refetch();
        },
      }
    );
  };

  const getCategoryLabel = (cat: GrievanceCategory) => {
    switch (cat) {
      case 'WORKPLACE_HARASSMENT':
        return '직장 내 괴롭힘';
      case 'SEXUAL_HARASSMENT':
        return '성희롱/성추행';
      case 'FRAUD_EMBEZZLEMENT':
        return '횡령 및 부정회계';
      case 'SAFETY_VIOLATION':
        return '안전 보건 위반';
      case 'GENERAL_GRIEVANCE':
        return '일반 인사 고충';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <HelpCircle className="w-7 h-7 text-rose-600" />
            사내 익명 고충 상담 및 윤리 제보함
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            제보자 IP 및 인적 사항을 일체 저장하지 않는 완전 익명 비밀 제보 및 조사 관리 채널입니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 익명 제보 작성
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b">
            <tr>
              <th className="p-3">접수 번호</th>
              <th className="p-3">분류</th>
              <th className="p-3">제보 제목</th>
              <th className="p-3">접수 일시</th>
              <th className="p-3">처리 상태</th>
              <th className="p-3 text-right">조사 / 회신</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">불러오는 중...</td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">접수된 익명 제보가 없습니다.</td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3 font-mono font-bold text-rose-600">{r.ticket_code}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-rose-50 text-rose-700 font-medium border border-rose-200">
                      {getCategoryLabel(r.category)}
                    </span>
                  </td>
                  <td className="p-3 font-medium max-w-sm truncate">{r.subject_title}</td>
                  <td className="p-3 text-slate-500">{new Date(r.submitted_at).toLocaleDateString('ko-KR')}</td>
                  <td className="p-3">
                    {r.status === 'SUBMITTED' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800 font-semibold">접수 대기</span>
                    )}
                    {r.status === 'UNDER_INVESTIGATION' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 font-semibold">조사 진행중</span>
                    )}
                    {r.status === 'RESOLVED' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-bold">조치 완료</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedTicket(r);
                        setFeedbackText(r.investigation_feedback || '');
                        setReplyModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-xs border rounded hover:bg-slate-100 font-medium inline-flex items-center gap-1 text-slate-700"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> 회신 작성
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 회신 모달 */}
      {replyModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-rose-700">
              <MessageSquare className="w-5 h-5" />
              [{selectedTicket.ticket_code}] 조사 결과 및 조치 회신
            </h2>
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200">제목: {selectedTicket.subject_title}</p>
              <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{selectedTicket.incident_content}</p>
            </div>
            <form onSubmit={handleReply} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">인사위원회 조치 회신문 *</label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="예: 관련 부서 관리자 면담 및 재발 방지 조치가 완료되었습니다."
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={4}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReplyModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-medium"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  조치 완료 회신
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 등록 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-rose-600">
              <ShieldCheck className="w-5 h-5" />
              익명 고충 제보 작성 (안심 채널)
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">제보 분류 *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as GrievanceCategory)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="WORKPLACE_HARASSMENT">직장 내 괴롭힘</option>
                  <option value="SEXUAL_HARASSMENT">성희롱/성추행</option>
                  <option value="FRAUD_EMBEZZLEMENT">횡령 및 부정회계</option>
                  <option value="SAFETY_VIOLATION">안전 보건 위반</option>
                  <option value="GENERAL_GRIEVANCE">일반 근무조건 고충</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">제보 제목 *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 특정 관리자의 지속적인 인격 모독 발언 건"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">구체적 내용 (10자 이상) *</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="언제, 어디서, 어떤 일이 발생했는지 구체적인 정황을 작성해 주세요."
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={4}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  사후 조회용 비밀 PIN 번호 (4자리 이상 숫자) *
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="예: 7788"
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono tracking-widest"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-medium"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700"
                >
                  익명 접수
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
